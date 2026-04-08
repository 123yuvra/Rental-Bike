const http = require('http');

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

(async () => {
  const p3000 = await checkPort(3000);
  const p1000 = await checkPort(1000);
  console.log(`Port 3000: ${p3000 ? 'OPEN' : 'CLOSED'}`);
  console.log(`Port 1000: ${p1000 ? 'OPEN' : 'CLOSED'}`);
})();
