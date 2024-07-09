const BOARD_SIZE = 10;
const SHIPS = [
    { size: 5, count: 1, name: "Carrier" },
    { size: 4, count: 1, name: "Battleship" },
    { size: 3, count: 2, name: "Cruiser" },
    { size: 2, count: 1, name: "Destroyer" }
];

let currentPlayer = 1;
let setupPhase = true;
let player1Ships = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
let player2Ships = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
let currentShip = null;
let player1ShipsPlaced = 0;
let player2ShipsPlaced = 0;
let computerHits = [];
let lastHitIndex = null;
let targetingMode = false;

function createBoard(boardId) {
    const board = document.getElementById(boardId);
    board.innerHTML = '';
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        board.appendChild(cell);
    }
}

function createShips(playerId) {
    const container = document.getElementById(`player${playerId}Ships`);
    container.innerHTML = '';
    SHIPS.forEach((shipType, index) => {
        for (let i = 0; i < shipType.count; i++) {
            const ship = document.createElement('div');
            ship.className = 'ship';
            ship.draggable = true;
            ship.dataset.size = shipType.size;
            ship.dataset.name = shipType.name;
            for (let j = 0; j < shipType.size; j++) {
                const cell = document.createElement('div');
                cell.className = `cell ship-cell-${playerId}`;
                ship.appendChild(cell);
            }
            container.appendChild(ship);
            ship.addEventListener('dragstart', dragStart);
            ship.addEventListener('dblclick', rotateShip);
        }
    });
}

function rotateShip(e) {
    e.currentTarget.classList.toggle('vertical');
}

function dragStart(e) {
    currentShip = e.target;
}

function canPlaceShip(board, startIndex, size, vertical) {
    const row = Math.floor(startIndex / BOARD_SIZE);
    const col = startIndex % BOARD_SIZE;

    if (!vertical && col + size > BOARD_SIZE) return false;
    if (vertical && row + size > BOARD_SIZE) return false;

    for (let i = 0; i < size; i++) {
        const index = vertical ? startIndex + i * BOARD_SIZE : startIndex + i;
        if (board[index]) return false;
    }

    return true;
}

function placeShip(board, startIndex, size, vertical, shipName) {
    for (let i = 0; i < size; i++) {
        const index = vertical ? startIndex + i * BOARD_SIZE : startIndex + i;
        board[index] = shipName;
    }
}

function handleDrop(e) {
    e.preventDefault();
    const cell = e.target;
    const board = cell.parentElement;
    const index = parseInt(cell.dataset.index);
    const size = parseInt(currentShip.dataset.size);
    const shipName = currentShip.dataset.name;
    const vertical = currentShip.classList.contains('vertical');

    if (canPlaceShip(player1Ships, index, size, vertical)) {
        placeShip(player1Ships, index, size, vertical, shipName);
        for (let i = 0; i < size; i++) {
            const shipCell = board.children[vertical ? index + i * BOARD_SIZE : index + i];
            shipCell.className = `cell ship-cell-1`;
        }
        currentShip.remove();
        player1ShipsPlaced++;
        checkSetupComplete();
    }
}

function checkSetupComplete() {
    const totalShips = SHIPS.reduce((sum, ship) => sum + ship.count, 0);
    if (player1ShipsPlaced === totalShips) {
        hidePlayerShips(1);
        placeComputerShips();
        startGame();
    }
}

function placeComputerShips() {
    SHIPS.forEach(shipType => {
        for (let i = 0; i < shipType.count; i++) {
            let placed = false;
            while (!placed) {
                const startIndex = Math.floor(Math.random() * (BOARD_SIZE * BOARD_SIZE));
                const vertical = Math.random() < 0.5;
                if (canPlaceShip(player2Ships, startIndex, shipType.size, vertical)) {
                    placeShip(player2Ships, startIndex, shipType.size, vertical, shipType.name);
                    placed = true;
                    player2ShipsPlaced++;
                }
            }
        }
    });
}

function startGame() {
    setupPhase = false;
    currentPlayer = 1;
    updateGameInfo("Your turn to attack");
    document.querySelectorAll('.ships-container').forEach(container => container.classList.add('hidden'));
}

function hidePlayerShips(player) {
    const search = player === 1 ? '#player1Board .ship-cell-1' : '#player2Board .ship-cell-2';
    document.querySelectorAll(search).forEach(cell => {
        cell.style.backgroundColor = 'transparent';
    });
}

function updateGameInfo(message) {
    document.getElementById('gameInfo').textContent = message;
}

function handleAttack(e) {
    if (setupPhase || currentPlayer !== 1) return;
    const cell = e.target;
    const board = cell.parentElement;
    const index = parseInt(cell.dataset.index);

    if (board.id !== 'player2Board' || cell.classList.contains('hit') || cell.classList.contains('miss')) return;

    const hit = player2Ships[index];

    if (hit) {
        cell.classList.add('hit');
        cell.classList.add('ship-cell-2');
        checkShipSunk(player2Ships, hit);
    } else {
        cell.classList.add('miss');
    }

    if (checkWin(player2Ships)) {
        updateGameInfo("You win!");
    } else {
        currentPlayer = 2;
        updateGameInfo("Computer's turn to attack");
        setTimeout(playComputerTurn, 1000);
    }
}

function playComputerTurn() {
    computerTurn();
    if (!checkWin(player1Ships)) {
        currentPlayer = 1;
        updateGameInfo("Your turn to attack");
    }
}

function computerTurn() {
    let index;

    if (targetingMode) {
        index = getTargetedAttack();
    } else {
        index = getRandomAttack();
    }

    if (index === null) {
        targetingMode = false;
        return computerTurn();
    }

    const cell = document.getElementById('player1Board').children[index];
    const hit = player1Ships[index];

    if (hit) {
        cell.classList.add('hit');
        cell.classList.add('ship-cell-1');
        computerHits.push(index);
        targetingMode = true;
        player1Ships[index] = null;
        updateLastDirection(index);
        checkShipSunk(player1Ships, hit);
    } else {
        cell.classList.add('miss');
        if (targetingMode) {
            lastDirection = null;
        }
    }

    if (checkWin(player1Ships)) {
        updateGameInfo("Computer wins!");
    }
}

function getRandomAttack() {
    let attempts = 0;
    let index;
    do {
        index = Math.floor(Math.random() * (BOARD_SIZE * BOARD_SIZE));
        attempts++;
        if (attempts > 100) return null; // Prevent infinite loop
    } while (computerHits.includes(index));
    return index;
}

function getTargetedAttack() {
    const lastHit = computerHits[computerHits.length - 1];
    const possibleDirections = ['up', 'right', 'down', 'left'];
    let direction = lastDirection || possibleDirections[Math.floor(Math.random() * possibleDirections.length)];

    for (let i = 0; i < possibleDirections.length; i++) {
        const index = getNextIndexInDirection(lastHit, direction);
        if (index !== null && !computerHits.includes(index) && !document.getElementById('player1Board').children[index].classList.contains('miss')) {
            return index;
        }
        // If this direction is blocked, try the next direction
        direction = possibleDirections[(possibleDirections.indexOf(direction) + 1) % possibleDirections.length];
    }

    // If all directions are blocked, reset targeting mode
    targetingMode = false;
    lastDirection = null;
    return null;
}

function getNextIndexInDirection(lastIndex, direction) {
    const row = Math.floor(lastIndex / BOARD_SIZE);
    const col = lastIndex % BOARD_SIZE;

    switch (direction) {
        case 'up':
            return row > 0 ? lastIndex - BOARD_SIZE : null;
        case 'right':
            return col < BOARD_SIZE - 1 ? lastIndex + 1 : null;
        case 'down':
            return row < BOARD_SIZE - 1 ? lastIndex + BOARD_SIZE : null;
        case 'left':
            return col > 0 ? lastIndex - 1 : null;
    }
}

function updateLastDirection(hitIndex) {
    if (computerHits.length < 2) {
        lastDirection = null;
        return;
    }

    const previousHit = computerHits[computerHits.length - 2];
    const diff = hitIndex - previousHit;

    if (diff === -BOARD_SIZE) lastDirection = 'up';
    else if (diff === 1) lastDirection = 'right';
    else if (diff === BOARD_SIZE) lastDirection = 'down';
    else if (diff === -1) lastDirection = 'left';
    else lastDirection = null;
}

function checkShipSunk(ships, shipName) {
    if (!ships.includes(shipName)) {
        updateGameInfo(`${currentPlayer === 1 ? 'You' : 'Computer'} sunk the ${shipName}!`);
        const board = currentPlayer === 1 ? document.getElementById('player2Board') : document.getElementById('player1Board');
        board.querySelectorAll('.hit').forEach(cell => {
            const index = parseInt(cell.dataset.index);
            if (ships[index] === shipName) {
                cell.classList.add('sunk');
            }
        });
        if (currentPlayer === 2) {
            // Reset targeting mode when a ship is sunk
            targetingMode = false;
            lastDirection = null;
            computerHits = [];
        }
    }
}

function checkWin(ships) {
    return !ships.some(ship => ship !== null);
}

function handleDragOver(e) {
    e.preventDefault();
    const cell = e.target;
    const board = cell.parentElement;
    const index = parseInt(cell.dataset.index);
    const size = parseInt(currentShip.dataset.size);
    const vertical = currentShip.classList.contains('vertical');

    clearShipPreview();

    if (canPlaceShip(player1Ships, index, size, vertical)) {
        showShipPreview(board, index, size, vertical);
    }
}

function showShipPreview(board, startIndex, size, vertical) {
    for (let i = 0; i < size; i++) {
        const index = vertical ? startIndex + i * BOARD_SIZE : startIndex + i;
        if (index < BOARD_SIZE * BOARD_SIZE) {
            const cell = board.children[index];
            cell.classList.add('ship-preview');
            cell.classList.add('ship-cell-1');
        }
    }
}

function clearShipPreview() {
    document.querySelectorAll('.ship-preview').forEach(cell => {
        cell.classList.remove('ship-preview');
        cell.classList.remove('ship-cell-1');
    });
}

// Initialize the game
createBoard('player1Board');
createBoard('player2Board');
createShips(1);
updateGameInfo("Place your ships");
document.getElementById('player1Board').addEventListener('dragover', handleDragOver);
document.getElementById('player1Board').addEventListener('drop', handleDrop);
document.getElementById('player2Board').addEventListener('click', handleAttack);