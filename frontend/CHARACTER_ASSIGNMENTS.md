# Angry Birds Chess - Character Team Assignment

## PLAYER TEAM: BIRDS ONLY 🐦

### Your Army (7 Birds)
- **Red Bird** → King 👑
  - Role: Leader that must be protected
  - Movement: One square in any direction
  - Special: Most important piece - losing him means game over!

- **Stella (Pink Bird)** → Queen 💖
  - Role: Most powerful piece on your team
  - Movement: Unlimited squares in all directions
  - Special: Bubble power - your strongest warrior!

- **Chuck (Yellow Bird)** → Rook/Tower ⚡
  - Role: Fast attacker
  - Movement: Unlimited squares horizontally/vertically
  - Special: Speed demon - controls ranks and files

- **Jay, Jake & Jim (Blue Birds)** → Bishop 🔵
  - Role: Diagonal specialists
  - Movement: Unlimited squares diagonally
  - Special: Split attack - three birds working as one

- **Bomb (Black Bird)** → Knight 💣
  - Role: Explosive jumper
  - Movement: L-shaped pattern (2+1 squares)
  - Special: Can jump over pieces and explode on impact

- **Matilda (White Bird)** → Pawn 🥚
  - Role: Frontline soldier (multiple pieces)
  - Movement: Forward one square (two on first move)
  - Special: Drops egg bombs, attacks diagonally

- **Hal (Green Bird)** → Bishop Alternative 🪃
  - Role: Boomerang specialist
  - Movement: Unlimited squares diagonally
  - Special: Boomerang trajectory - unique return patterns

---

## AI TEAM: FULL PIG ARMY 🐷

### The Enemy (Full Army)
- **King Pig** → King 👑
  - Your ultimate target to defeat!

- **Queen Pig** → Queen 👸
  - Most dangerous enemy piece

- **Corporal Pig** → Rook 🪖
  - Military defender with helmet

- **Foreman Pig** → Bishop 👷
  - Construction expert with hard hat

- **Ninja Pig** → Knight 🥷
  - Stealthy masked warrior

- **Regular Pigs** → Pawns (8 pieces) 🐷
  - Basic pig soldiers forming frontline

---

## GAME CONCEPT
- **You (Player)**: Control only birds - a smaller but specialized team
- **AI Enemy**: Controls full pig army with all traditional chess pieces
- **Objective**: Use your bird team's unique abilities to checkmate the King Pig
- **Challenge**: David vs. Goliath - skill vs. numbers!

---

## FILES STRUCTURE
Each character now has its own file in `/components/characters/`:
- `RedBird.js` - King piece
- `Stella.js` - Queen piece  
- `YellowBird.js` - Rook piece
- `BlueBird.js` - Bishop piece
- `BlackBird.js` - Knight piece
- `WhiteBird.js` - Pawn piece
- `GreenBird.js` - Bishop alternative
- `KingPig.js` - Enemy King
- `QueenPig.js` - Enemy Queen
- `CorporalPig.js` - Enemy Rook
- `ForemanPig.js` - Enemy Bishop
- `NinjaPig.js` - Enemy Knight
- `RegularPig.js` - Enemy Pawns
- `index.js` - Exports all characters and team configurations
