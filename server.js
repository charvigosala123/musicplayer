require('dotenv').config();

const oracledb = require('oracledb');
oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_11_2' });

const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes to serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'music3.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Oracle DB config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION
};

// Test DB connection
(async function testDBConnection() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to Oracle DB');
    await connection.close();
  } catch (err) {
    console.error('❌ Oracle DB connection error:', err);
  }
})();

// Reusable Nodemailer transporter (avoid creating new each time)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const verificationCodes = {};   // { email: code }
const passwordResetCodes = {};  // { email: { code, expiresAt } }

function generateOTP() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

app.post('/send-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const code = generateOTP();
  verificationCodes[email] = code;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Crescendo - Email Verification Code',
      text: Your Crescendo verification code is: ${code},
    });
    res.json({ message: 'Verification code sent to your email!' });
  } catch (error) {
    console.error('❌ Error sending verification code:', error);
    res.status(500).json({ message: 'Error sending verification code' });
  }
});

app.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });

  if (verificationCodes[email] && verificationCodes[email] === code.toUpperCase()) {
    delete verificationCodes[email];
    return res.json({ message: 'Email verified!' });
  } else {
    return res.status(400).json({ message: 'Invalid verification code' });
  }
});

app.post('/signup', async (req, res) => {
  const { fullname, email, username, password } = req.body;
  if (!fullname || !email || !username || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  try {
    const connection = await oracledb.getConnection(dbConfig);

    const existingUser = await connection.execute(
      SELECT * FROM users WHERE email = :email OR username = :username,
      { email, username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existingUser.rows.length > 0) {
      await connection.close();
      return res.status(400).json({ success: false, message: 'Username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await connection.execute(
      `INSERT INTO users (id, fullname, email, username, password_hash) 
       VALUES (users_seq.NEXTVAL, :fullname, :email, :username, :password_hash)`,
      { fullname, email, username, password_hash: passwordHash },
      { autoCommit: true }
    );

    await connection.close();
    res.status(201).json({ success: true, message: 'User registered successfully!' });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      SELECT * FROM users WHERE username = :username,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      await connection.close();
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.PASSWORD_HASH);

    await connection.close();

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.ID, username: user.USERNAME },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    res.json({ success: true, message: 'Login successful', token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/songs', async (req, res) => {
  const { mood } = req.query;
  if (!mood) {
    return res.status(400).json({ message: 'Missing mood query parameter' });
  }

  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT s.id, s.youtube_id, s.title, s.artist, s.duration_sec, s.thumbnail_url
       FROM songs s
       JOIN song_moods sm ON s.id = sm.song_id
       JOIN moods m ON sm.mood_id = m.id
       WHERE LOWER(m.name) = LOWER(:mood)
       ORDER BY s.title`,
      { mood },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    await connection.close();

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Mood fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      SELECT * FROM users WHERE email = :email,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    await connection.close();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    passwordResetCodes[email] = { code, expiresAt };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Crescendo - Password Reset Code',
      text: Your password reset code is: ${code}\n\nThis code will expire in 10 minutes.,
    });

    res.json({ message: 'Password reset code sent to your email!' });
  } catch (err) {
    console.error('❌ Error sending password reset code:', err);
    res.status(500).json({ message: 'Server error while requesting password reset' });
  }
});

app.post('/confirm-password-reset', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password required' });
  }

  const entry = passwordResetCodes[email];
  if (!entry) {
    return res.status(400).json({ message: 'No reset request found for this email' });
  }

  if (entry.code !== code.toUpperCase()) {
    return res.status(400).json({ message: 'Invalid reset code' });
  }

  if (Date.now() > entry.expiresAt) {
    delete passwordResetCodes[email];
    return res.status(400).json({ message: 'Reset code expired' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      UPDATE users SET password_hash = :password WHERE email = :email,
      { password: hashedPassword, email },
      { autoCommit: true }
    );
    await connection.close();

    delete passwordResetCodes[email];
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('❌ Password reset error:', err);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT id, fullname, email, username, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
       FROM users WHERE id = :id`,
      { id: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    await connection.close();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      username: user.USERNAME,
      email: user.EMAIL,
      created_at: user.CREATED_AT
    });
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST route – to save a played song (KEEP THIS)
app.post('/api/user/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { song_name } = req.body;

  if (!song_name) {
    return res.status(400).json({ message: 'song_name is required' });
  }

  try {
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `INSERT INTO history (id, user_id, song_name, played_at)
       VALUES (HISTORY_SEQ.NEXTVAL, :userId, :song_name, SYSTIMESTAMP)`,
      { userId, song_name },
      { autoCommit: true }
    );
    await connection.close();
    res.json({ message: 'Song play added to history' });
  } catch (err) {
    console.error('❌ Error adding to history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ ADD THIS BELOW — GET route to fetch user history
app.get('/api/user/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT song_name, played_at
       FROM history
       WHERE user_id = :userId
       ORDER BY played_at DESC`,
      { userId }
    );

    await connection.close();

    const formatted = result.rows.map(row => ({
      song_name: row[0],
      played_at: row[1]
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ✅ NEW: DELETE route – to clear a user's song history
app.delete('/api/user/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      DELETE FROM history WHERE user_id = :userId,
      { userId },
      { autoCommit: true }
    );
    await connection.close();

    res.json({ message: 'History cleared successfully' });
  } catch (err) {
    console.error('❌ Error clearing history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.listen(port, () => {
  console.log(🚀 Server running at http://localhost:${port});
});