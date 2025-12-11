// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "hardhat/console.sol";

contract BlackJack {
    address public owner;

    struct Card {
        uint8 rank; // 2-10 for number cards, 11 for Jack, 12 for Queen, 13 for King, 14 for Ace
        uint8 suit; // 0 for Hearts, 1 for Diamonds, 2 for Clubs, 3 for Spades
    }

    struct Player {
        address addr;
        Card[] hand;
        uint256 bet;
        bool hasBlackJack;
        bool isBusted;
        bool hasStood;
    }

    mapping(address => Player) public players;
    address[] public playerAddresses;

    Card[] public deck;
    uint256 public currentCardIndex;

    address public dealer;
    Card[] public dealerHand;
    bool public dealerHasBlackJack;
    bool public dealerIsBusted;

    enum GameState { Betting, PlayerTurn, DealerTurn, Finished }
    GameState public gameState;

    event PlayerJoined(address indexed player);
    event PlayerBet(address indexed player, uint256 amount);
    event PlayerHit(address indexed player, Card card);
    event PlayerStand(address indexed player);
    event DealerHit(address indexed dealer, Card card);
    event GameFinished(address indexed winner);

    constructor() {
        owner = msg.sender;
        dealer = address(this);
        initializeDeck();
    }

    function joinGame() public {
        require(players[msg.sender].addr == address(0), "Player already joined");
        players[msg.sender].addr = msg.sender;
        playerAddresses.push(msg.sender);
        emit PlayerJoined(msg.sender);
    }

    function placeBet(uint256 amount) public payable {
        require(msg.value == amount, "Sent ETH does not match bet amount");
        require(players[msg.sender].addr != address(0), "Player has not joined");
        require(gameState == GameState.Betting, "Not in betting phase");

        players[msg.sender].bet = amount;
        emit PlayerBet(msg.sender, amount);
    }

    function startGame() public {
        // This is a simplified start game function.
        // In a real game, you'd have a more robust mechanism
        // to start the game once all players have bet.
        gameState = GameState.PlayerTurn;
        shuffleDeck();
        dealInitialCards();
    }

    function initializeDeck() internal {
        delete deck;
        for (uint8 suit = 0; suit < 4; suit++) {
            for (uint8 rank = 2; rank <= 14; rank++) {
                deck.push(Card(rank, suit));
            }
        }
    }

    function shuffleDeck() internal {
        // Fisher-Yates shuffle
        for (uint i = deck.length - 1; i > 0; i--) {
            uint j = uint(keccak256(abi.encodePacked(block.timestamp, i))) % (i + 1);
            (deck[i], deck[j]) = (deck[j], deck[i]);
        }
        currentCardIndex = 0;
    }

    function dealCard() internal returns (Card memory) {
        require(currentCardIndex < deck.length, "No more cards in deck");
        return deck[currentCardIndex++];
    }

    function dealInitialCards() internal {
        // Deal two cards to each player
        for (uint i = 0; i < playerAddresses.length; i++) {
            players[playerAddresses[i]].hand.push(dealCard());
            players[playerAddresses[i]].hand.push(dealCard());
            checkBlackJack(playerAddresses[i]);
        }
        // Deal two cards to the dealer
        dealerHand.push(dealCard());
        dealerHand.push(dealCard());
        dealerHasBlackJack = getHandValue(dealerHand) == 21;
    }

    function getHandValue(Card[] memory hand) internal pure returns (uint8) {
        uint8 value = 0;
        uint8 numAces = 0;
        for (uint i = 0; i < hand.length; i++) {
            if (hand[i].rank >= 10 && hand[i].rank <= 13) { // J, Q, K
                value += 10;
            } else if (hand[i].rank == 14) { // Ace
                numAces++;
                value += 11;
            } else {
                value += hand[i].rank;
            }
        }
        while (value > 21 && numAces > 0) {
            value -= 10;
            numAces--;
        }
        return value;
    }

    function checkBlackJack(address playerAddr) internal {
        if (getHandValue(players[playerAddr].hand) == 21) {
            players[playerAddr].hasBlackJack = true;
        }
    }

    function hit() public {
        require(gameState == GameState.PlayerTurn, "Not player's turn");
        Player storage player = players[msg.sender];
        require(!player.isBusted && !player.hasStood, "Player cannot hit");

        Card memory newCard = dealCard();
        player.hand.push(newCard);
        emit PlayerHit(msg.sender, newCard);

        if (getHandValue(player.hand) > 21) {
            player.isBusted = true;
        }
    }

    function stand() public {
        require(gameState == GameState.PlayerTurn, "Not player's turn");
        Player storage player = players[msg.sender];
        require(!player.isBusted && !player.hasStood, "Player cannot stand");

        player.hasStood = true;
        emit PlayerStand(msg.sender);

        // If all players have stood or are busted, it's the dealer's turn
        bool allPlayersDone = true;
        for (uint i = 0; i < playerAddresses.length; i++) {
            if (!players[playerAddresses[i]].isBusted && !players[playerAddresses[i]].hasStood) {
                allPlayersDone = false;
                break;
            }
        }

        if (allPlayersDone) {
            playDealerTurn();
        }
    }

    function playDealerTurn() internal {
        gameState = GameState.DealerTurn;
        while (getHandValue(dealerHand) < 17) {
            Card memory newCard = dealCard();
            dealerHand.push(newCard);
            emit DealerHit(dealer, newCard);
        }

        if (getHandValue(dealerHand) > 21) {
            dealerIsBusted = true;
        }

        finishGame();
    }

    function finishGame() internal {
        gameState = GameState.Finished;
        uint8 dealerValue = getHandValue(dealerHand);

        for (uint i = 0; i < playerAddresses.length; i++) {
            address playerAddr = playerAddresses[i];
            Player storage player = players[playerAddr];

            if (player.isBusted) {
                // Player loses bet
            } else if (dealerIsBusted || getHandValue(player.hand) > dealerValue) {
                // Player wins
                payable(playerAddr).transfer(player.bet * 2);
                emit GameFinished(playerAddr);
            } else if (getHandValue(player.hand) == dealerValue) {
                // Push, return bet
                payable(playerAddr).transfer(player.bet);  // 4
            } else {
                // Player loses
            }
        }
    }

    // --- Getter Functions ---
    function getDealerHand() public view returns (Card[] memory) {
        return dealerHand;
    }

    function getPlayerHand(address player) public view returns (Card[] memory) {
        return players[player].hand;
    }
}