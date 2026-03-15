const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve the career-os portal for all routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'career-os-v2.html'))
})

app.listen(PORT, () => {
  console.log(`Career-OS portal running on port ${PORT}`)
})
