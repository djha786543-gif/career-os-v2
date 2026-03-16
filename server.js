const express = require('express')
const path = require('path')
const fs = require('fs')
const app = express()
const PORT = process.env.PORT || 3000

const outDir = path.join(__dirname, 'frontend', 'out')

// Verify out directory exists
if (!fs.existsSync(outDir)) {
  console.error('ERROR: frontend/out/ not found!')
  console.error('Contents of frontend/:',
    fs.readdirSync(path.join(__dirname, 'frontend')))
  process.exit(1)
}

console.log('Serving from:', outDir)

// Serve static files
app.use(express.static(outDir))

// Health check — must respond immediately
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Fallback for all routes
app.get('(.*)', (req, res) => {
  const indexPath = path.join(outDir, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('Portal not built yet')
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log('Career-OS portal running on port ' + PORT)
})
