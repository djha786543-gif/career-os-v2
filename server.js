const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

// Serve Next.js static export
app.use(express.static(path.join(__dirname, 'frontend', 'out')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Fallback for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'out', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Career-OS portal running on port ${PORT}`)
  console.log(`Serving from: ${path.join(__dirname, 'frontend', 'out')}`)
})
