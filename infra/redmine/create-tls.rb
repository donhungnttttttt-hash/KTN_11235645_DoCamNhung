require 'openssl'
require 'fileutils'
root = '/tls'
paths = %w[ca/mysql-ca.pem server/server-cert.pem server/server-key.pem].map { |path| File.join(root, path) }
if paths.all? { |path| File.file?(path) }
  puts 'Sandbox TLS files already exist; preserved.'
  exit
end
abort 'Partial TLS material exists; inspect it before regeneration.' if paths.any? { |path| File.exist?(path) }
FileUtils.mkdir_p([File.join(root, 'ca'), File.join(root, 'server')])
ca_key = OpenSSL::PKey::RSA.new(3072)
ca = OpenSSL::X509::Certificate.new
ca.version = 2
ca.serial = OpenSSL::BN.rand(128).to_i
ca.subject = OpenSSL::X509::Name.parse('/CN=TMS Sandbox Database CA')
ca.issuer = ca.subject
ca.public_key = ca_key.public_key
ca.not_before = Time.now - 300
ca.not_after = Time.now + 5 * 365 * 24 * 60 * 60
factory = OpenSSL::X509::ExtensionFactory.new
factory.subject_certificate = ca
factory.issuer_certificate = ca
ca.add_extension(factory.create_extension('basicConstraints', 'CA:TRUE', true))
ca.add_extension(factory.create_extension('keyUsage', 'keyCertSign,cRLSign', true))
ca.add_extension(factory.create_extension('subjectKeyIdentifier', 'hash'))
ca.sign(ca_key, OpenSSL::Digest::SHA256.new)
server_key = OpenSSL::PKey::RSA.new(3072)
server = OpenSSL::X509::Certificate.new
server.version = 2
server.serial = OpenSSL::BN.rand(128).to_i
server.subject = OpenSSL::X509::Name.parse('/CN=database')
server.issuer = ca.subject
server.public_key = server_key.public_key
server.not_before = ca.not_before
server.not_after = ca.not_after
factory.subject_certificate = server
server.add_extension(factory.create_extension('basicConstraints', 'CA:FALSE', true))
server.add_extension(factory.create_extension('keyUsage', 'digitalSignature,keyEncipherment', true))
server.add_extension(factory.create_extension('extendedKeyUsage', 'serverAuth'))
server.add_extension(factory.create_extension('subjectAltName', 'DNS:database'))
server.sign(ca_key, OpenSSL::Digest::SHA256.new)
File.write(paths[0], ca.to_pem)
File.write(paths[1], server.to_pem)
File.write(paths[2], server_key.to_pem)
# CA private key is not persisted. The application only mounts the public CA directory.
puts 'Created sandbox CA and server certificate with DNS:database; no key printed.'
