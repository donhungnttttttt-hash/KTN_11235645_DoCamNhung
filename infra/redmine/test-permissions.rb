# Fault injection only for the isolated demo project. Restore with seed.rb.
abort('Not an isolated TMS sandbox') unless Project.count == 1 && Project.first.identifier == 'tms-sandbox' && !Project.first.is_public?
role = Role.find_by!(name: 'TMS Integration')
role.permissions = role.permissions - [:add_issues]
role.save!
puts 'Sandbox add_issues denied temporarily; run the seed script to restore.'
