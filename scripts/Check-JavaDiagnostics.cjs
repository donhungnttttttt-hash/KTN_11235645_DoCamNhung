#!/usr/bin/env node
// Reproduce Java IDE warnings with Eclipse, which Maven's javac does not report.
// This compiles main + test sources only; it never starts the app or database.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'Backend/target/java-diagnostics');

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return value;
}

function compilerJar() {
  const supplied = option('--compiler');
  if (supplied) return path.resolve(supplied);
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) throw new Error('Pass --compiler with an Eclipse compiler batch JAR path.');
  const extensions = path.join(home, '.vscode/extensions');
  if (fs.existsSync(extensions)) {
    const installed = fs.readdirSync(extensions).filter(name => /^redhat\.java-/.test(name))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const name of installed) {
      const plugins = path.join(extensions, name, 'server/plugins');
      if (!fs.existsSync(plugins)) continue;
      const jar = fs.readdirSync(plugins).find(file => /^org\.eclipse\.jdt\.core\.compiler\.batch_.*\.jar$/.test(file));
      if (jar) return path.join(plugins, jar);
    }
  }
  throw new Error('Eclipse compiler not found. Install VS Code Java extension or pass --compiler.');
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : entry.name.endsWith('.java') ? [file] : [];
  });
}

function run() {
  const compiler = compilerJar();
  if (!fs.existsSync(compiler)) throw new Error('Compiler JAR does not exist.');
  const env = { ...process.env };
  const javaHome = option('--java-home') || env.JAVA_HOME;
  const windows = process.platform === 'win32';
  const java = javaHome ? path.join(javaHome, 'bin', windows ? 'java.exe' : 'java') : 'java';
  if (javaHome) {
    env.JAVA_HOME = javaHome;
    const key = Object.keys(env).find(name => name.toLowerCase() === 'path') || 'PATH';
    env[key] = path.join(javaHome, 'bin') + path.delimiter + (env[key] || '');
  }
  fs.mkdirSync(output, { recursive: true });
  const classpathFile = path.join(output, 'classpath.txt');
  const mavenArgs = ['-B', '-ntp', 'dependency:build-classpath', '-DincludeScope=test', `-Dmdep.outputFile=${classpathFile}`];
  // Always resolve against the current pom.xml, rather than reusing a stale IDE classpath.
  const resolve = cp.spawnSync('rtk', windows
    ? ['proxy', 'cmd.exe', '/c', 'mvnw.cmd', ...mavenArgs]
    : ['proxy', './mvnw', ...mavenArgs], { cwd: path.join(root, 'Backend'), env, encoding: 'utf8' });
  if (resolve.error || resolve.status !== 0) {
    fs.writeFileSync(path.join(output, 'classpath-resolution.log'), (resolve.stdout || '') + (resolve.stderr || ''));
    throw new Error(`Maven classpath resolution failed; see ${path.relative(root, output)}/classpath-resolution.log.`);
  }
  const properties = {
    'annotation.nullanalysis': 'enabled',
    'annotation.nonnull': 'org.springframework.lang.NonNull',
    'annotation.nullable': 'org.springframework.lang.Nullable',
    'annotation.nonnullbydefault': 'org.springframework.lang.NonNullApi',
    'annotation.nonnull.secondary': 'javax.annotation.Nonnull,org.eclipse.jdt.annotation.NonNull,org.jspecify.annotations.NonNull',
    'annotation.nullable.secondary': 'javax.annotation.Nullable,org.eclipse.jdt.annotation.Nullable,org.jspecify.annotations.Nullable',
    'annotation.nonnullbydefault.secondary': 'javax.annotation.ParametersAreNonnullByDefault,org.eclipse.jdt.annotation.NonNullByDefault,org.jspecify.annotations.NullMarked',
    'problem.nullUncheckedConversion': 'warning',
    'problem.nullSpecViolation': 'error',
    'problem.nullReference': 'error',
    'problem.potentialNullReference': 'warning',
    'problem.unusedImport': 'warning',
    'problem.unusedLocal': 'warning',
    'problem.unusedPrivateMember': 'warning',
    // Match Java extension workspace default; this is not a suppression for null safety.
    'problem.missingSerialVersion': 'ignore'
  };
  const preferences = path.join(output, 'compiler.properties');
  fs.writeFileSync(preferences, Object.entries(properties).map(([key, value]) => `org.eclipse.jdt.core.compiler.${key}=${value}`).join('\n'));
  const sources = ['main', 'test'].flatMap(kind => sourceFiles(path.join(root, `Backend/src/${kind}/java`)));
  const compilerArgs = ['-jar', compiler, '-21', '-encoding', 'UTF-8', '-parameters',
    '-classpath', fs.readFileSync(classpathFile, 'utf8').trim(), '-properties', preferences,
    '-d', path.join(output, 'classes'), '-log', path.join(output, 'diagnostics.xml'), ...sources];
  // Source paths plus the test classpath exceed Windows' command-line limit as the project grows.
  // Java's argument-file parser supports quoted values and escaped backslashes; no shell is involved.
  const argumentFile = path.join(output, 'compiler.args');
  const quote = value => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r') + '"';
  fs.writeFileSync(argumentFile, compilerArgs.map(quote).join('\n'), 'utf8');
  const result = cp.spawnSync(java, ['@' + argumentFile],
    { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw new Error(`Cannot start Java compiler: ${result.error.message}`);
  const log = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(output, 'diagnostics.txt'), log);
  const diagnostics = [...log.matchAll(/(WARNING|ERROR) in (.*?) \(at line (\d+)\)([\s\S]*?)(?=\n----------|$)/g)]
    .map(match => ({ kind: match[1], file: path.relative(root, match[2]).replaceAll('\\', '/'),
      line: Number(match[3]), message: match[4].trim().split('\n').at(-1).trim() }));
  const summary = { sourceCount: sources.length, errors: diagnostics.filter(item => item.kind === 'ERROR').length,
    warnings: diagnostics.filter(item => item.kind === 'WARNING').length, compilerExitCode: result.status,
    compiler: path.basename(compiler), output: path.relative(root, output).replaceAll('\\', '/') };
  fs.writeFileSync(path.join(output, 'diagnostics.json'), JSON.stringify({ summary, diagnostics }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  for (const item of diagnostics) console.log(`${item.kind} ${item.file}:${item.line} ${item.message}`);
  if (result.status !== 0 && !diagnostics.length) console.error(log);
  // Warning-free is the gate; compilation success alone is insufficient.
  process.exitCode = result.status === 0 && diagnostics.length === 0 ? 0 : 1;
}

try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
