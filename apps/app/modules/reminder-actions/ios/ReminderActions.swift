import ExpoModulesCore
import ExpoNotifications
import UserNotifications

// Done and Snooze on a reminder, handled here so they work with the app closed.
// React Native only starts when a window opens (the scene life cycle iOS 27
// requires), so when iOS launches the app in the background for a button that
// doesn't open it, JavaScript never runs. Snooze is scheduled on the spot; each
// Done is kept on the device until the app next opens and saves it
// (src/notifications/responses.ts). Start and a plain tap open the app, so
// they're left to JavaScript.

/** One Done waiting to be saved, as the JavaScript side's `DoneEntry` (an empty `day` is none). */
private func doneEntry(_ response: UNNotificationResponse, taskId: String) -> [String: Any] {
  let info = response.notification.request.content.userInfo
  return [
    "key": "\(response.notification.request.identifier)|\(response.notification.date.timeIntervalSince1970)",
    "taskId": taskId,
    "day": info["day"] as? String ?? "",
    "rollover": info["rollover"] as? Int ?? 0,
    "at": Date().timeIntervalSince1970 * 1000,
  ]
}

final class ReminderActionsDelegate: NotificationDelegate {
  static let shared = ReminderActionsDelegate()

  private static let queueKey = "pn.reminders.done-queue"
  private static let snoozeSeconds: TimeInterval = 10 * 60
  private static let lock = NSLock()

  func didReceive(_ response: UNNotificationResponse, completionHandler: @escaping () -> Void) -> Bool {
    let content = response.notification.request.content
    guard let taskId = content.userInfo["taskId"] as? String else { return false }
    switch response.actionIdentifier {
    case "snooze":
      Self.snooze(content, taskId: taskId)
      return true
    case "done":
      Self.queue(doneEntry(response, taskId: taskId))
      // A one-off is finished: nothing more of it should ring. A repeat rings again next time.
      let repeats = content.userInfo["repeats"] as? Bool ?? false
      Self.cancel(taskId: taskId, everything: !repeats)
      return true
    default:
      return false
    }
  }

  /** The same words again in 10 minutes. The task itself doesn't move. */
  private static func snooze(_ content: UNNotificationContent, taskId: String) {
    guard let copy = content.mutableCopy() as? UNMutableNotificationContent else { return }
    let at = Date().addingTimeInterval(snoozeSeconds)
    let identifier = "snooze:\(taskId):\(Int64(at.timeIntervalSince1970 * 1000))"
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: snoozeSeconds, repeats: false)
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: identifier, content: copy, trigger: trigger))
  }

  /** Its snoozes, or (for a finished one-off) everything of it, pending or still on the Lock Screen. */
  private static func cancel(taskId: String, everything: Bool) {
    let center = UNUserNotificationCenter.current()
    let matches = { (identifier: String) -> Bool in
      let parts = identifier.split(separator: ":")
      guard parts.count >= 2, parts[1] == taskId else { return false }
      return everything || parts[0] == "snooze"
    }
    center.getPendingNotificationRequests { requests in
      center.removePendingNotificationRequests(withIdentifiers: requests.map(\.identifier).filter(matches))
    }
    if everything {
      center.getDeliveredNotifications { delivered in
        center.removeDeliveredNotifications(withIdentifiers: delivered.map(\.request.identifier).filter(matches))
      }
    }
  }

  static func queue(_ entry: [String: Any]) {
    lock.lock()
    defer { lock.unlock() }
    var entries = UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]] ?? []
    entries.append(entry)
    UserDefaults.standard.set(entries, forKey: queueKey)
  }

  static func pending() -> [[String: Any]] {
    lock.lock()
    defer { lock.unlock() }
    return UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]] ?? []
  }

  static func remove(keys: [String]) {
    lock.lock()
    defer { lock.unlock() }
    let entries = UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]] ?? []
    UserDefaults.standard.set(entries.filter { !keys.contains($0["key"] as? String ?? "") }, forKey: queueKey)
  }
}

/** Joins expo-notifications' delegates at launch, before JavaScript (if it ever starts). */
public class ReminderActionsAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    NotificationCenterManager.shared.addDelegate(ReminderActionsDelegate.shared)
    return true
  }
}

/** For JavaScript: the Dones waiting to be saved, and removing the ones it has saved. */
public class ReminderActionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReminderActions")

    Function("pendingDone") { () -> [[String: Any]] in
      ReminderActionsDelegate.pending()
    }

    Function("removeDone") { (keys: [String]) in
      ReminderActionsDelegate.remove(keys: keys)
    }
  }
}
