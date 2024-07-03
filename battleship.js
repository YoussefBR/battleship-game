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

    const playerShips = currentPlayer === 1 ? player1Ships : player2Ships;

    if (canPlaceShip(playerShips, index, size, vertical)) {
        placeShip(playerShips, index, size, vertical, shipName);
        for (let i = 0; i < size; i++) {
            const shipCell = board.children[vertical ? index + i * BOARD_SIZE : index + i];
            shipCell.className = `cell ship-cell-${currentPlayer}`;
        }
        currentShip.remove();
        if (currentPlayer === 1) {
            player1ShipsPlaced++;
        } else {
            player2ShipsPlaced++;
        }
        checkSetupComplete();
    }
}

function checkSetupComplete() {
    const totalShips = SHIPS.reduce((sum, ship) => sum + ship.count, 0);
    if (player1ShipsPlaced === totalShips && player2ShipsPlaced === totalShips) {
        hidePlayerShips(2);
        startGame();
    } else if (player1ShipsPlaced === totalShips && currentPlayer === 1) {
        hidePlayerShips(1);
        currentPlayer = 2;
        document.getElementById('player2Ships').classList.remove('hidden');
        updateGameInfo("Player 2, place your ships");
    } else if (player2ShipsPlaced === totalShips && currentPlayer === 2) {
        currentPlayer = 1;
        updateGameInfo("Player 1, place your ships");
    }
}

function startGame() {
    setupPhase = false;
    currentPlayer = 1;
    updateGameInfo("Player 1's turn to attack");
    document.querySelectorAll('.ships-container').forEach(container => container.classList.add('hidden'));
}

function hidePlayerShips(player) {
    search = player === 1 ? '#player1Board .ship-cell-1' : '#player2Board .ship-cell-2';
    document.querySelectorAll(search).forEach(cell => {
        cell.style.backgroundColor = 'transparent';
    });
}

function updateGameInfo(message) {
    document.getElementById('gameInfo').textContent = message;
}

function handleAttack(e) {
    if (setupPhase) return;
    const cell = e.target;
    const board = cell.parentElement;
    const index = parseInt(cell.dataset.index);
    const attackingPlayer = currentPlayer;
    const defendingPlayer = 3 - currentPlayer;

    if (attackingPlayer === 1 && board.id !== 'player2Board') return;
    if (attackingPlayer === 2 && board.id !== 'player1Board') return;

    if (cell.classList.contains('hit') || cell.classList.contains('miss')) return;

    const defendingShips = defendingPlayer === 1 ? player1Ships : player2Ships;
    const hit = defendingShips[index];

    if (hit) {
        cell.classList.add('hit');
        cell.classList.add(`ship-cell-${defendingPlayer}`);
        checkShipSunk(defendingShips, hit);
    } else {
        cell.classList.add('miss');
    }

    if (checkWin()) {
        updateGameInfo(`Player ${attackingPlayer} wins!`);
    } else {
        currentPlayer = defendingPlayer;
        updateGameInfo(`Player ${currentPlayer}'s turn to attack`);
    }
}

function checkShipSunk(ships, shipName) {
    if (!ships.includes(shipName)) {
        updateGameInfo(`Player ${currentPlayer} sunk the ${shipName}!`);
        const board = currentPlayer === 1 ? document.getElementById('player2Board') : document.getElementById('player1Board');
        board.querySelectorAll('.hit').forEach(cell => {
            const index = parseInt(cell.dataset.index);
            if (ships[index] === shipName) {
                cell.classList.add('sunk');
            }
        });
    }
}

function checkWin() {
    // TODO: implement
}

function handleDragOver(e) {
    e.preventDefault();
    const cell = e.target;
    const board = cell.parentElement;
    const index = parseInt(cell.dataset.index);
    const size = parseInt(currentShip.dataset.size);
    const vertical = currentShip.classList.contains('vertical');

    clearShipPreview();

    if (canPlaceShip(currentPlayer === 1 ? player1Ships : player2Ships, index, size, vertical)) {
        showShipPreview(board, index, size, vertical);
    }
}

function showShipPreview(board, startIndex, size, vertical) {
    for (let i = 0; i < size; i++) {
        const index = vertical ? startIndex + i * BOARD_SIZE : startIndex + i;
        if (index < BOARD_SIZE * BOARD_SIZE) {
            const cell = board.children[index];
            cell.classList.add('ship-preview');
            cell.classList.add(`ship-cell-${currentPlayer}`);
        }
    }
}

function clearShipPreview() {
    document.querySelectorAll('.ship-preview').forEach(cell => {
        cell.classList.remove('ship-preview');
        cell.classList.remove('ship-cell-1');
        cell.classList.remove('ship-cell-2');
    });
}

// Initialize the game
createBoard('player1Board');
createBoard('player2Board');
createShips(1);
createShips(2);
document.getElementById('player2Ships').classList.add('hidden');
updateGameInfo("Player 1, place your ships");
document.getElementById('player1Board').addEventListener('dragover', handleDragOver);
document.getElementById('player1Board').addEventListener('drop', handleDrop);
document.getElementById('player2Board').addEventListener('dragover', handleDragOver);
document.getElementById('player2Board').addEventListener('drop', handleDrop);
document.getElementById('player1Board').addEventListener('click', handleAttack);
document.getElementById('player2Board').addEventListener('click', handleAttack);