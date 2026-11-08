// Runs the real student_identity backend on http://localhost:3000 with the
// in-memory fake database that ships with its tests (test/helpers.js).
// Nothing is written to Supabase, and no file in student_identity is changed.
//
// Usage (from this folder's parent, after `npm install` inside student_identity):
//   node student_identity_ui/dev-tools/mock-backend.js ./student_identity
//
// Data lives in memory only and resets every time this script restarts.

const path = require('path');

const repo = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'student_identity'));
const PORT = Number(process.env.PORT || 3000);

let app;
try {
  // helpers.js swaps lib/db.js for an in-memory store, sets NODE_ENV=test
  // (so /dev/* routes are mounted) and points webhooks at a closed port.
  require(path.join(repo, 'test', 'helpers.js'));
  app = require(path.join(repo, 'server.js'));
} catch (err) {
  console.error(`Could not load the backend from ${repo}`);
  console.error('Check the path, and run `npm install` inside student_identity first.');
  console.error(err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  process.stdout.write(`Mock Student Identity backend: http://localhost:${PORT}\n`);
  process.stdout.write('Seeded: student 6731500001 (Ann Lee), service client "internship-service"\n');
});
