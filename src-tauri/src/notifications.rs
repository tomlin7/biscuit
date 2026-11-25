use tauri::command;

#[command]
pub fn send_desktop_notification(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let safe_title = title.replace('\'', "''");
        let safe_body = body.replace('\'', "''");
        let script = format!(
            r#"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
$textNodes = $template.GetElementsByTagName('text');
$textNodes.Item(0).AppendChild($template.CreateTextNode('{}')) | Out-Null;
$textNodes.Item(1).AppendChild($template.CreateTextNode('{}')) | Out-Null;
$toast = [Windows.UI.Notifications.ToastNotification]::new($template);
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('T3D').Show($toast);
"#,
            safe_title, safe_body
        );
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let safe_title = title.replace('"', "\\\"");
        let safe_body = body.replace('"', "\\\"");
        let script = format!(r#"display notification "{safe_body}" with title "{safe_title}""#);
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn();
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("notify-send")
            .args([&title, &body])
            .spawn();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn send_desktop_notification_accepts_strings() {
        let res = send_desktop_notification("Test Title".into(), "Test Body".into());
        assert!(res.is_ok());
    }
}
