const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Example user database (use MongoDB in production)
const users = [
  { id: 1, username: 'user1', password: bcrypt.hashSync('password1', 10) },
  { id: 2, username: 'user2', password: bcrypt.hashSync('password2', 10) },
];

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, 'secretKey', { expiresIn: '1h' });
  res.json({ token });
});

// Middleware to validate JWT token
function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).send('Access denied.');

  jwt.verify(token, 'secretKey', (err, user) => {
    if (err) return res.status(403).send('Invalid token.');
    req.user = user;
    next();
  });
}

module.exports = authenticateJWT;
