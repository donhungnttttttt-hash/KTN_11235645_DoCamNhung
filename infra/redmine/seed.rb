# Local sandbox only. Executed with Rails runner inside the separate compose project.
require 'json'
abort 'Refusing to seed a server containing other projects' if Project.where.not(identifier: 'tms-sandbox').exists?

result = nil
ActiveRecord::Base.transaction do
  admin = User.find_by!(login: 'admin')
  User.current = admin
  fresh = !Project.exists?(identifier: 'tms-sandbox')
  if fresh
    admin.password = ENV.fetch('TMS_SANDBOX_ADMIN_PASSWORD')
    admin.password_confirmation = admin.password
    admin.must_change_passwd = false
    admin.save!
  end
  Setting.app_title = 'TMS Redmine Sandbox'
  Setting.rest_api_enabled = '1'
  Setting.login_required = '1'
  Setting.self_registration = '0'
  Setting.notified_events = []

  names = {
    'open' => 'Chưa xử lý', 'progress' => 'Đang xử lý', 'recheck' => 'SYP kiểm tra lại',
    'clarify' => 'Xác nhận đặc tả / mức độ', 'ready' => 'Sẵn sàng xử lý',
    'planning' => 'Lập kế hoạch', 'resolved' => 'Đã xử lý',
    'unreproducible' => 'Không tái hiện', 'wontfix' => 'Không xử lý', 'closed' => 'Hoàn thành'
  }
  statuses = {}
  names.each_with_index do |(code, name), index|
    status = IssueStatus.find_or_initialize_by(name: name)
    status.assign_attributes(is_closed: %w[unreproducible wontfix closed].include?(code), position: index + 1)
    status.save!
    statuses[code] = status.id
  end
  priorities = {}
  { 'LOW' => 'Thấp', 'MEDIUM' => 'Trung bình', 'HIGH' => 'Cao' }.each_with_index do |(code, name), index|
    priority = IssuePriority.find_or_initialize_by(name: name)
    priority.assign_attributes(position: index + 1, active: true, is_default: code == 'MEDIUM')
    priority.save!
    priorities[code] = priority.id
  end
  tracker = Tracker.find_or_initialize_by(name: 'Bug TMS')
  tracker.assign_attributes(default_status_id: statuses.fetch('open'), private_by_default: true)
  tracker.save!
  role = Role.find_or_initialize_by(name: 'TMS Integration')
  role.permissions = %i[view_issues add_issues edit_issues set_own_issues_private]
  role.issues_visibility = 'all'
  role.save!
  ([0] + statuses.values).each do |old_status|
    statuses.values.each do |new_status|
      next if old_status == new_status
      WorkflowTransition.find_or_create_by!(role_id: role.id, tracker_id: tracker.id,
                                           old_status_id: old_status, new_status_id: new_status)
    end
  end
  field = IssueCustomField.find_or_initialize_by(name: 'TMS Correlation')
  field.assign_attributes(field_format: 'string', is_filter: true, is_required: true,
                          is_for_all: false, visible: true, min_length: 36, max_length: 36)
  field.save!
  field.trackers = [tracker]
  project = Project.find_or_initialize_by(identifier: 'tms-sandbox')
  project.assign_attributes(name: 'TMS Sandbox — dữ liệu thử nội bộ', is_public: false,
                            description: 'Chỉ kiểm chứng tích hợp TMS. Không chứa dữ liệu khách hàng.')
  project.enabled_module_names = ['issue_tracking']
  project.save!
  project.trackers = [tracker]
  project.issue_custom_fields = [field]

  account = User.find_or_initialize_by(login: 'tms.integration')
  if account.new_record?
    account.assign_attributes(firstname: 'TMS', lastname: 'Integration', mail: 'tms.integration@example.invalid',
                              admin: false, status: User::STATUS_ACTIVE, must_change_passwd: false,
                              mail_notification: 'none')
    account.password = ENV.fetch('TMS_SANDBOX_SERVICE_PASSWORD')
    account.password_confirmation = account.password
    account.save!
  end
  abort 'Sandbox service account must not be an administrator' if account.admin?
  membership = Member.find_or_initialize_by(project: project, user: account)
  membership.roles = [role]
  membership.save!
  result = { version: Redmine::VERSION.to_s, projectId: project.id, trackerId: tracker.id,
             correlationFieldId: field.id, statuses: statuses, priorities: priorities,
             apiKey: account.api_key }
end
# Caller captures this privately; never echo this line to a terminal or commit its output.
puts "TMS_SEED_RESULT=#{JSON.generate(result)}"
