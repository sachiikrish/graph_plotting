# Accessible Mathematical Graphing Platform (MERN)

## Run
Requires Node 18+ and MongoDB running locally (or an Atlas URI).

    cd server && .env && npm install && npx nodemon server.js
    cd client && npm install && npm run dev      # http://localhost:5173

## Keys
Arrows move | Enter plot | I set step | Q quadrant sound | R review (arrows step through points)
0/Home reset to origin | Backspace undo | S save | L load latest | H help

## API
POST /api/graphs
GET  /api/graphs/:id
GET  /api/graphs/student/:studentId

## Plotting mode
Keys only work after choosing "Start plotting" (focus moves into a role="application" region so screen
readers pass arrow keys through). Escape leaves plotting mode. Axis names and per-axis grid scale are set
beforehand and saved with each graph.
