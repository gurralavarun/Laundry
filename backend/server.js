const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello');
});

app.get('/api', (req, res) => {
  res.json({ message: 'This is the API endpoint' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
