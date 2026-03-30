use std::sync::Mutex;
use zbus::blocking::{Connection, MessageIterator};
use zbus::message::Message;

/// Cached focused element from AT-SPI focus events.
static FOCUSED_ELEMENT: Mutex<Option<(String, String)>> = Mutex::new(None);
/// Cached AT-SPI connection for querying caret position.
static QUERY_CONN: Mutex<Option<Connection>> = Mutex::new(None);

/// Connect to the AT-SPI2 accessibility bus.
fn atspi_connection() -> Option<Connection> {
    if let Ok(addr) = std::env::var("AT_SPI_BUS_ADDRESS") {
        let conn = zbus::blocking::connection::Builder::address(addr.as_str())
            .ok()
            .and_then(|b| b.build().ok());
        if conn.is_some() {
            return conn;
        }
    }

    let session = Connection::session().ok()?;
    let reply = session
        .call_method(
            Some("org.a11y.Bus"),
            "/org/a11y/bus",
            Some("org.a11y.Bus"),
            "GetAddress",
            &(),
        )
        .ok()?;
    let address: String = reply.body().deserialize().ok()?;
    zbus::blocking::connection::Builder::address(address.as_str())
        .ok()?
        .build()
        .ok()
}

/// Start background thread to monitor AT-SPI focus events.
pub fn init() {
    std::thread::Builder::new()
        .name("atspi-focus-monitor".into())
        .spawn(|| {
            if let Err(e) = focus_monitor_loop() {
                eprintln!("[caret] AT-SPI focus monitor exited: {e}");
            }
        })
        .ok();
}

fn focus_monitor_loop() -> Result<(), Box<dyn std::error::Error>> {
    let conn = atspi_connection().ok_or("Failed to connect to AT-SPI bus")?;

    // Register for focus and caret events with the AT-SPI registry
    let _ = conn.call_method(
        Some("org.a11y.atspi.Registry"),
        "/org/a11y/atspi/registry",
        Some("org.a11y.atspi.Registry"),
        "RegisterEvent",
        &("object:state-changed:focused", Vec::<String>::new(), ""),
    );
    let _ = conn.call_method(
        Some("org.a11y.atspi.Registry"),
        "/org/a11y/atspi/registry",
        Some("org.a11y.atspi.Registry"),
        "RegisterEvent",
        &("object:text-caret-moved", Vec::<String>::new(), ""),
    );

    // Iterate all messages on the connection and filter by interface
    let mut iter = MessageIterator::from(&conn);

    while let Some(Ok(msg)) = iter.next() {
        let header = msg.header();
        let iface = match header.interface() {
            Some(i) => i.as_str(),
            None => continue,
        };

        if iface == "org.a11y.atspi.Event.Object" || iface == "org.a11y.atspi.Event.Focus" {
            process_message(&msg);
        }
    }

    Ok(())
}

fn process_message(msg: &Message) {
    let header = msg.header();

    let member = match header.member() {
        Some(m) => m.as_str().to_string(),
        None => return,
    };

    let sender = match header.sender() {
        Some(s) => s.as_str().to_string(),
        None => return,
    };

    let path = match header.path() {
        Some(p) => p.as_str().to_string(),
        None => return,
    };

    match member.as_str() {
        "StateChanged" => {
            if let Ok((state_name, detail1)) = msg.body().deserialize::<(String, i32)>() {
                if state_name == "focused" && detail1 == 1 {
                    if let Ok(mut guard) = FOCUSED_ELEMENT.lock() {
                        *guard = Some((sender, path));
                    }
                }
            }
        }
        "TextCaretMoved" => {
            if let Ok(mut guard) = FOCUSED_ELEMENT.lock() {
                *guard = Some((sender, path));
            }
        }
        "Focus" => {
            // org.a11y.atspi.Event.Focus.Focus signal
            if let Ok(mut guard) = FOCUSED_ELEMENT.lock() {
                *guard = Some((sender, path));
            }
        }
        _ => {}
    }
}

pub fn get_caret_position() -> Option<(f64, f64)> {
    let (bus_name, obj_path) = {
        let guard = FOCUSED_ELEMENT.lock().ok()?;
        guard.clone()?
    };

    // Reuse cached connection or create a new one
    let mut conn_guard = QUERY_CONN.lock().ok()?;
    if conn_guard.is_none() {
        *conn_guard = atspi_connection();
    }
    let conn = conn_guard.as_ref()?;

    // Get caret offset via the Text interface
    let caret_reply = conn
        .call_method(
            Some(bus_name.as_str()),
            obj_path.as_str(),
            Some("org.a11y.atspi.Text"),
            "GetCaretOffset",
            &(),
        )
        .ok()?;
    let caret_offset: i32 = caret_reply.body().deserialize().ok()?;

    // Get character extents at caret position (coord_type 0 = screen coordinates)
    let extents_reply = conn
        .call_method(
            Some(bus_name.as_str()),
            obj_path.as_str(),
            Some("org.a11y.atspi.Text"),
            "GetCharacterExtents",
            &(caret_offset, 0u32),
        )
        .ok()?;
    let (x, y, _w, h): (i32, i32, i32, i32) = extents_reply.body().deserialize().ok()?;

    if x <= 0 && y <= 0 {
        return None;
    }

    Some((x as f64, (y + h) as f64))
}
