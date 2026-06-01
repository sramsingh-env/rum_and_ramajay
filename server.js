require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// Protect admin page and orders API
app.use((req, res, next) => {
  const protected_ = req.path === '/admin.html' || req.path === '/api/orders';
  if (protected_ && !req.session.authenticated) {
    return req.path.startsWith('/api/')
      ? res.status(401).json({ error: 'Unauthorized' })
      : res.redirect('/login.html');
  }
  next();
});

app.use(express.static(path.join(__dirname)));

app.post('/api/login', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Incorrect password.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.post('/api/order', async (req, res) => {
  const { firstName, lastName, contactNumber, collectionDay, collectionLocation, quantity, totalPrice, deliveryFee } = req.body;

  if (!firstName || !lastName || !contactNumber || !collectionDay || !collectionLocation || !quantity) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      first_name: firstName,
      last_name: lastName,
      contact_number: contactNumber,
      collection_day: collectionDay,
      collection_location: collectionLocation,
      quantity: parseInt(quantity, 10),
      total_price: totalPrice ?? parseInt(quantity, 10) * 300,
      delivery_fee: deliveryFee ?? 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to save order.' });
  }

  res.json({ success: true, id: data.id });
});

app.get('/api/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }

  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel:  http://localhost:${PORT}/admin.html`);
});
