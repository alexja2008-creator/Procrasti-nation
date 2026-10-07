Pod::Spec.new do |s|
  s.name           = 'ReminderActions'
  s.version        = '1.0.0'
  s.summary        = 'Done and Snooze on a ProcrastiNation reminder, with the app closed.'
  s.description    = s.summary
  s.license        = 'UNLICENSED'
  s.author         = 'ProcrastiNation'
  s.homepage       = 'https://procrasti-nation.work'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoNotifications'

  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
