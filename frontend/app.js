// --- DOM Elements ---
const boardElement = document.getElementById("board");
const playerElement = document.getElementById("player");
const rollButton = document.getElementById("roll-button");
const diceDisplay = document.getElementById("dice-display");
const healthDisplay = document.getElementById("player-health");
const attackDisplay = document.getElementById("player-attack");
const ownedWeaponsList = document.getElementById("owned-weapons-list");
const messageLog = document.getElementById("message-log");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");
const connectButton = document.getElementById("connect-button");
const walletInfo = document.getElementById("wallet-info");
const walletAddressDisplay = document.getElementById("wallet-address");

// --- Web3 State ---
let provider, signer, userAddress, contract;
const targetChainId = "0x7a69"; // 31337 in hex (Hardhat Network)

// !!! IMPORTANT: Fill in your deployed contract address here !!!
const contractAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

const contractABI = [
  "constructor()",
  "function getMyWeapons() view returns (tuple(string itemName, string description, string image, bool isUsed, address owner)[])",
  "function getWeapon(uint256) view returns (tuple(string itemName, string description, string image, bool isUsed, address owner))",
  "function markAsUsed(uint256)",
  "function mintWeapon(address, string, string, string)",
  "function name() view returns (string)",
  "function nextTokenId() view returns (uint256)",
  "function owner() view returns (address)",
  "function ownerWeapons(address, uint256) view returns (uint256)",
  "function symbol() view returns (string)",
  "function useWeapon(uint256)",
  "function weapons(uint256) view returns (string, string, string, bool, address)",
];

// --- Game State ---
let playerPosition = 0;
let playerHealth = 100;
let playerAttack = 0;
let ownedWeaponIds = [];
let isMoving = false;

const weaponsData = {
  //NFT Lists
};
const totalItems = Object.keys(weaponsData).length;

let boardLayout = [];
const boardSize = 6;
const totalTiles = boardSize * 4 - 4;

// --- Utility Functions ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateRandomBoardLayout() {
  const newLayout = Array(totalTiles).fill(null);

  // --- UPDATED ICONS ---
  newLayout[0] = { type: "start", icon: "🏁" };
  const cornerImage = "images/redcastle.png";
  newLayout[boardSize - 1] = {
    type: "corner",
    name: "Castle",
    image: cornerImage,
  };
  newLayout[(boardSize - 1) * 2] = {
    type: "corner",
    name: "Castle",
    image: cornerImage,
  };
  newLayout[(boardSize - 1) * 3] = {
    type: "corner",
    name: "Castle",
    image: cornerImage,
  };

  const availableIndices = [];
  for (let i = 1; i < totalTiles; i++) {
    if (newLayout[i] === null) availableIndices.push(i);
  }
  shuffleArray(availableIndices);

  const itemImage = "images/weapon.png";
  const itemsToPlace = Object.keys(weaponsData).map((id) => ({
    type: "item",
    name: "Weapon",
    image: itemImage,
    weaponId: parseInt(id),
  }));

  const monstersToPlace = [
    { type: "monster", name: "Goblin", image: "images/goblin.png", power: 10 },
    { type: "monster", name: "Ghost", image: "images/ghost.png", power: 15 },
    { type: "monster", name: "Dragon", image: "images/dragon.png", power: 25 },
    { type: "monster", name: "Ark", image: "images/ark.png", power: 12 },
    { type: "monster", name: "Wolf", image: "images/wolve.png", power: 18 },
    { type: "monster", name: "Caster", image: "images/caster.png", power: 22 },
    { type: "monster", name: "Snake", image: "images/snake.png", power: 14 },
    {
      type: "monster",
      name: "Scorpion",
      image: "images/sporpion.png",
      power: 19,
    },
    { type: "monster", name: "Bat", image: "images/bat.png", power: 8 },
    { type: "monster", name: "Golem", image: "images/golem.png", power: 30 },
  ];
  shuffleArray(monstersToPlace);

  itemsToPlace.forEach((item) => {
    if (availableIndices.length > 0) newLayout[availableIndices.pop()] = item;
  });
  monstersToPlace.forEach((monster) => {
    if (availableIndices.length > 0)
      newLayout[availableIndices.pop()] = monster;
  });
  availableIndices.forEach((index) => {
    newLayout[index] = { type: "empty" };
  });

  return newLayout;
}

// --- Web3 Functions ---
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    logMessage("กรุณาติดตั้ง MetaMask!");
    showSimpleModal(
      "ข้อผิดพลาด",
      "ไม่พบ MetaMask, กรุณาติดตั้ง Extension ใน Browser ของคุณ"
    );
    return;
  }
  if (
    contractAddress === "YOUR_CONTRACT_ADDRESS_HERE" ||
    contractAddress.length !== 42
  ) {
    logMessage("ยังไม่ได้ตั้งค่า Contract Address!");
    showSimpleModal(
      "ข้อผิดพลาด",
      "กรุณาตั้งค่า Contract Address ที่ถูกต้องในโค้ดก่อน"
    );
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId.toString() !== parseInt(targetChainId, 16).toString()) {
      logMessage(
        `กรุณาเปลี่ยนเป็นเครือข่าย ChainID: ${parseInt(targetChainId, 16)}`
      );
      showSimpleModal(
        "เครือข่ายไม่ถูกต้อง",
        `กรุณาเปลี่ยนเครือข่ายใน MetaMask เป็น Hardhat (ChainID: ${parseInt(
          targetChainId,
          16
        )})`
      );
      return;
    }

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    contract = new ethers.Contract(contractAddress, contractABI, signer);

    walletAddressDisplay.textContent = userAddress;
    walletInfo.classList.remove("hidden");
    connectButton.textContent = "เชื่อมต่อสำเร็จ";
    connectButton.disabled = true;
    connectButton.classList.add("bg-green-600", "cursor-not-allowed");
    connectButton.classList.remove("bg-orange-500", "hover:bg-orange-600");
    rollButton.disabled = false;

    logMessage(
      `เชื่อมต่อกับ Wallet: ${userAddress.substring(
        0,
        6
      )}...${userAddress.substring(userAddress.length - 4)}`
    );
    await updateOwnedWeapons();
  } catch (error) {
    console.error("Could not connect to wallet:", error);
    logMessage("การเชื่อมต่อ Wallet ล้มเหลว");
    showSimpleModal(
      "เกิดข้อผิดพลาด",
      "ไม่สามารถเชื่อมต่อกับ Wallet ได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

async function updateOwnedWeapons() {
  if (!contract) return;
  try {
    const weapons = await contract.getMyWeapons();
    ownedWeaponIds = [];
    playerAttack = 0;
    ownedWeaponsList.innerHTML = "";

    if (weapons.length === 0) {
      ownedWeaponsList.innerHTML =
        '<span class="text-gray-400">- ยังไม่มี -</span>';
    } else {
      weapons.forEach((weapon) => {
        const weaponId = Object.keys(weaponsData).find(
          (key) => weaponsData[key].image === weapon.image
        );
        if (weaponId) {
          const parsedWeaponId = parseInt(weaponId);
          if (!ownedWeaponIds.includes(parsedWeaponId)) {
            ownedWeaponIds.push(parsedWeaponId);
            playerAttack += weaponsData[parsedWeaponId].attack;
          }
        }
        const li = document.createElement("div");
        li.classList.add("owned-weapon-item");
        li.innerHTML = `
                            <img src="${weapon.image}" alt="${weapon.itemName}" onerror="this.onerror=null;this.src='https://placehold.co/32x32/333/fff?text=NFT';">
                            <span>${weapon.itemName}</span>
                        `;
        ownedWeaponsList.appendChild(li);
      });
    }
    updateUI();
    checkWinCondition();
  } catch (error) {
    console.error("Failed to fetch weapons:", error);
    logMessage("ไม่สามารถดึงข้อมูลอาวุธได้");
  }
}

async function mintWeapon(weaponId) {
  const weapon = weaponsData[weaponId];
  if (!contract || !weapon) return;

  showSimpleModal(
    "กำลัง Mint...",
    `กำลังสร้าง NFT "${weapon.name}"... กรุณายืนยันใน MetaMask`
  );

  try {
    const tx = await contract.mintWeapon(
      userAddress,
      weapon.name,
      weapon.desc,
      weapon.image
    );
    logMessage(`กำลังส่ง Transaction: ${tx.hash.substring(0, 10)}...`);

    await tx.wait();

    logMessage(`Mint สำเร็จ! คุณได้รับ "${weapon.name}"`);
    showSimpleModal(
      "สำเร็จ!",
      `คุณได้รับ "${weapon.name}" เข้าสู่ Wallet ของคุณแล้ว`,
      false,
      weapon.image
    );

    await updateOwnedWeapons();
  } catch (error) {
    console.error("Minting failed:", error);
    logMessage("การ Mint ล้มเหลว");
    showSimpleModal("ล้มเหลว", "การ Mint ไอเท็มล้มเหลว กรุณาตรวจสอบ Console");
  }
}

// --- Game Logic ---
function initializeGame() {
  playerPosition = 0;
  playerHealth = 100;
  playerAttack = 0;
  ownedWeaponIds = [];
  isMoving = false;
  boardLayout = generateRandomBoardLayout();
  createBoard();
  updateUI();
  requestAnimationFrame(() => {
    updatePlayerPosition();
  });
}

function createBoard() {
  boardElement.innerHTML = "";
  let tileIndex = 0;
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const tileDiv = document.createElement("div");
      if (
        row === 0 ||
        row === boardSize - 1 ||
        col === 0 ||
        col === boardSize - 1
      ) {
        const tileData = boardLayout[tileIndex];
        tileDiv.id = `tile-${tileIndex}`;
        tileDiv.classList.add("tile", tileData.type);
        if (tileData.weaponId) tileDiv.dataset.weaponId = tileData.weaponId;

        if (tileData.image) {
          const img = document.createElement("img");
          img.src = tileData.image;
          img.alt = tileData.name || tileData.type;
          img.classList.add("tile-image");
          tileDiv.appendChild(img);
        } else if (tileData.icon) {
          const span = document.createElement("span");
          span.classList.add("tile-icon");
          span.textContent = tileData.icon;
          tileDiv.appendChild(span);
        }
        tileIndex++;
      } else {
        tileDiv.classList.add("inner-tile");
      }
      boardElement.appendChild(tileDiv);
    }
  }
}

function getTileCoordinates(index) {
  if (!boardElement.clientWidth) return { top: 0, left: 0 };
  const tileWidth = boardElement.clientWidth / boardSize;
  const tileHeight = boardElement.clientHeight / boardSize;
  const playerSize = playerElement.offsetWidth;
  let row, col;

  if (index <= boardSize - 1) {
    // Top row
    row = 0;
    col = index;
  } else if (index <= (boardSize - 1) * 2) {
    // Right column
    col = boardSize - 1;
    row = index - (boardSize - 1);
  } else if (index <= (boardSize - 1) * 3) {
    // Bottom row
    row = boardSize - 1;
    col = (boardSize - 1) * 3 - index;
  } else {
    // Left column
    row = (boardSize - 1) * 4 - index;
    col = 0;
  }

  return {
    top: row * tileHeight + tileHeight / 2 - playerSize / 2,
    left: col * tileWidth + tileWidth / 2 - playerSize / 2,
  };
}

function updatePlayerPosition() {
  const { top, left } = getTileCoordinates(playerPosition);
  playerElement.style.top = `${top}px`;
  playerElement.style.left = `${left}px`;

  const playerSize = (boardElement.clientWidth / boardSize) * 0.8;
  playerElement.style.width = `${playerSize}px`;
  playerElement.style.height = `${playerSize}px`;
}

function logMessage(msg) {
  const p = document.createElement("p");
  p.textContent = `> ${msg}`;
  messageLog.appendChild(p);
  messageLog.scrollTop = messageLog.scrollHeight;
}

function updateUI() {
  healthDisplay.textContent = Math.max(0, playerHealth);
  attackDisplay.textContent = playerAttack;

  document.querySelectorAll(".tile.item").forEach((tileEl) => {
    const weaponId = parseInt(tileEl.dataset.weaponId);
    if (ownedWeaponIds.includes(weaponId)) {
      tileEl.classList.add("owned-item-tile");
    } else {
      tileEl.classList.remove("owned-item-tile");
    }
  });

  if (playerHealth <= 0) {
    showSimpleModal("จบเกม", "คุณพ่ายแพ้... พลังชีวิตหมดลง", true);
    rollButton.disabled = true;
  }
}

function showSimpleModal(title, text, isGameOver = false, imageUrl = null) {
  modal.classList.remove("hidden");
  let imageHtml = "";
  if (imageUrl) {
    imageHtml = `<img src="${imageUrl}" alt="${title}" class="w-32 h-32 mx-auto mb-4 rounded-lg object-contain shadow-lg" onerror="this.onerror=null;this.src='https://placehold.co/128x128/333/fff?text=IMG';">`;
  }
  modalContent.innerHTML = `
                <h2 class="text-2xl font-bold mb-4 text-red-500">${title}</h2>
                ${imageHtml}
                <p class="mb-6 text-gray-300">${text}</p>
                <button id="modal-button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">ตกลง</button>
            `;
  const modalButton = document.getElementById("modal-button");
  if (isGameOver) {
    modalButton.textContent = "เริ่มใหม่";
    modalButton.onclick = () => location.reload();
  } else {
    modalButton.onclick = () => modal.classList.add("hidden");
  }
}

function showMintModal(weaponId) {
  const weapon = weaponsData[weaponId];
  if (!weapon) return;

  modal.classList.remove("hidden");
  modalContent.innerHTML = `
                <h2 class="text-2xl font-bold mb-2 text-yellow-400">พบไอเท็ม!</h2>
                <img src="${weapon.image}" alt="${weapon.name}" class="w-48 h-48 mx-auto my-4 rounded-lg object-cover shadow-lg border-2 border-gray-500" onerror="this.onerror=null;this.src='https://placehold.co/192x192/333/fff?text=NFT';">
                <h3 class="text-xl font-semibold text-white">${weapon.name}</h3>
                <p class="text-gray-400 my-2">${weapon.desc}</p>
                <p class="text-yellow-400 font-bold">พลังโจมตี: +${weapon.attack}</p>
                <div class="flex gap-4 justify-center mt-6">
                    <button id="mint-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">Mint NFT</button>
                    <button id="cancel-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">ไม่สนใจ</button>
                </div>
            `;
  document.getElementById("mint-btn").onclick = () => mintWeapon(weaponId);
  document.getElementById("cancel-btn").onclick = () =>
    modal.classList.add("hidden");
}

async function rollDice() {
  if (isMoving || playerHealth <= 0 || !contract) return;

  isMoving = true;
  rollButton.disabled = true;
  diceDisplay.classList.add("rolling");

  const roll = Math.floor(Math.random() * 6) + 1;

  await new Promise((resolve) => setTimeout(resolve, 500));
  diceDisplay.textContent = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][roll - 1];
  diceDisplay.classList.remove("rolling");
  logMessage(`คุณทอยได้ ${roll} แต้ม!`);

  await movePlayer(roll);

  isMoving = false;
  if (playerHealth > 0) rollButton.disabled = false;
}

async function movePlayer(steps) {
  for (let i = 0; i < steps; i++) {
    playerPosition = (playerPosition + 1) % totalTiles;
    updatePlayerPosition();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  handleTileAction();
}

function handleTileAction() {
  const tileData = boardLayout[playerPosition];
  const tileType = tileData.type;
  const logText = tileData.name ? `${tileType}: ${tileData.name}` : tileType;
  logMessage(`คุณมาถึงช่อง: ${logText}`);

  switch (tileType) {
    case "item":
      if (!ownedWeaponIds.includes(tileData.weaponId)) {
        logMessage(`คุณพบไอเท็ม "${weaponsData[tileData.weaponId].name}"!`);
        showMintModal(tileData.weaponId);
      } else {
        logMessage(`คุณมีไอเท็มชิ้นนี้แล้ว`);
      }
      break;
    case "monster":
      fightMonster(tileData);
      break;
    default:
      logMessage("ช่องนี้ว่างเปล่า... เดินทางต่อ");
      break;
  }
}

function fightMonster(monster) {
  logMessage(`คุณเจอมอนสเตอร์ ${monster.name} (พลัง: ${monster.power})!`);
  const playerRoll = Math.floor(Math.random() * 20) + 1 + playerAttack;
  const monsterRoll = Math.floor(Math.random() * 20) + monster.power / 2;

  if (playerRoll >= monsterRoll) {
    logMessage(
      `คุณชนะ! (คุณ: ${playerRoll.toFixed(
        0
      )} vs มอนสเตอร์: ${monsterRoll.toFixed(0)})`
    );
    showSimpleModal(
      "ชนะ!",
      `คุณเอาชนะ ${monster.name} ได้สำเร็จ!`,
      false,
      monster.image
    );
  } else {
    const damage = monster.power + Math.floor(Math.random() * 10);
    playerHealth -= damage;
    logMessage(
      `คุณแพ้! โดนโจมตี ${damage} ดาเมจ (คุณ: ${playerRoll.toFixed(
        0
      )} vs มอนสเตอร์: ${monsterRoll.toFixed(0)})`
    );
    showSimpleModal(
      "พ่ายแพ้",
      `คุณถูก ${monster.name} โจมตี! เสียพลังชีวิต ${damage} หน่วย`,
      false,
      monster.image
    );
    updateUI();
  }
}

function startNewLevel() {
  logMessage("ด่านสำเร็จ! กำลังสร้างด่านใหม่...");
  showSimpleModal("ด่านสำเร็จ!", "เตรียมพบกับความท้าทายต่อไป!");
  ownedWeaponIds = [];
  playerAttack = 0;
  boardLayout = generateRandomBoardLayout();
  createBoard();
  updateUI();
  playerPosition = 0;
  updatePlayerPosition();
}

function checkWinCondition() {
  if (ownedWeaponIds.length === totalItems) {
    startNewLevel();
  }
}

// --- Event Listeners ---
connectButton.addEventListener("click", connectWallet);
rollButton.addEventListener("click", rollDice);
window.addEventListener("resize", updatePlayerPosition);
window.addEventListener("DOMContentLoaded", initializeGame);