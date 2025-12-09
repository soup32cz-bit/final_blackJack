const { ethers } = require("hardhat");

async function main() {
  const [deployer, player2] = await ethers.getSigners();
  console.log(`Deploying contract with the account: ${deployer.address}`);
  const BlackJack = await ethers.getContractFactory("BlackJack");
  const blackJackContract = await BlackJack.deploy();
  await blackJackContract.waitForDeployment();

  const contractAddress = await blackJackContract.getAddress();
  console.log(`BlackJack contract deployed at: ${contractAddress}`);

  console.log("\n--- Joining Game ---");
  // Player 1 (deployer) joins
  await blackJackContract.connect(deployer).joinGame();
  console.log("Deployer joined the game.");

  // Player 2 joins
  await blackJackContract.connect(player2).joinGame();
  console.log(`Player 2 (${player2.address}) joined the game.`);

  console.log("\n--- Placing Bets ---");
  // Player 1 places a bet
  await blackJackContract.connect(deployer).placeBet(ethers.parseEther("1.0"), { value: ethers.parseEther("1.0") });
  console.log("Deployer placed a bet of 1.0 ETH.");

  // Player 2 places a bet
  await blackJackContract.connect(player2).placeBet(ethers.parseEther("0.5"), { value: ethers.parseEther("0.5") });
  console.log(`Player 2 placed a bet of 0.5 ETH.`);

  console.log("\n--- Starting Game ---");
  await blackJackContract.startGame();
  console.log("Game started.");

}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exitCode = 1;
});
