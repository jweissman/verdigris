import { Game } from "../core/game";
import Input from "../core/input";

export class CardDrawGame extends Game {
  private playerId: string = "player";
  private cardHand: string[] = [];
  private maxCards: number = 7;
  private drawCooldown: number = 0;
  private playedCards: string[] = [];
  
  input: Input = new Input(this.sim, this.renderer);
  
  // Card definitions with effects
  private cardTypes = {
    "Lightning Bolt": { cost: 3, effect: "Deal 5 damage to target", rarity: "common" },
    "Healing Potion": { cost: 2, effect: "Restore 8 health", rarity: "common" },
    "Frost Shield": { cost: 4, effect: "Block next 3 attacks", rarity: "uncommon" },
    "Fire Storm": { cost: 6, effect: "Deal 3 damage to all enemies", rarity: "rare" },
    "Time Warp": { cost: 8, effect: "Take an extra turn", rarity: "epic" },
    "Teleport": { cost: 3, effect: "Move to any position", rarity: "common" },
    "Summon Wolf": { cost: 5, effect: "Summon a wolf ally", rarity: "uncommon" },
    "Meteor": { cost: 9, effect: "Deal 12 damage to target area", rarity: "legendary" }
  };
  
  bootstrap() {
    super.bootstrap();
    
    // Set up simple view
    this.renderer.setViewMode("top");
    
    // Initialize with a starting hand
    this.drawInitialHand();
    
    console.log('=== Card Draw MWE ===');
    console.log('Controls:');
    console.log('  SPACE - Draw a card');
    console.log('  1-7 - Play card from hand');
    console.log('  R - Reset hand');
    console.log('  H - Show hand');
    console.log('  P - Show played cards');
    console.log('');
    this.showHand();
  }
  
  private drawInitialHand() {
    // Draw 5 starting cards
    for (let i = 0; i < 5; i++) {
      this.drawCard();
    }
  }
  
  private drawCard() {
    if (this.drawCooldown > 0) {
      console.log(`Draw on cooldown: ${this.drawCooldown} ticks remaining`);
      return;
    }
    
    if (this.cardHand.length >= this.maxCards) {
      console.log("Hand is full! Cannot draw more cards.");
      return;
    }
    
    // Weighted random draw based on rarity
    const cardNames = Object.keys(this.cardTypes);
    const weights = cardNames.map(name => {
      const rarity = this.cardTypes[name].rarity;
      switch(rarity) {
        case "common": return 40;
        case "uncommon": return 25;
        case "rare": return 20;
        case "epic": return 10;
        case "legendary": return 5;
        default: return 20;
      }
    });
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    let selectedCard = cardNames[0];
    
    for (let i = 0; i < cardNames.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedCard = cardNames[i];
        break;
      }
    }
    
    this.cardHand.push(selectedCard);
    this.drawCooldown = 10; // 10 tick cooldown
    
    const cardInfo = this.cardTypes[selectedCard];
    console.log(`\\n🎴 Drew: ${selectedCard} (${cardInfo.rarity})`);
    console.log(`   Cost: ${cardInfo.cost} | Effect: ${cardInfo.effect}`);
    console.log(`   Hand size: ${this.cardHand.length}/${this.maxCards}`);
  }
  
  private playCard(index: number) {
    if (index < 1 || index > this.cardHand.length) {
      console.log("Invalid card position");
      return;
    }
    
    const cardIndex = index - 1; // Convert to 0-based index
    const cardName = this.cardHand[cardIndex];
    const cardInfo = this.cardTypes[cardName];
    
    console.log(`\\n⚡ Playing: ${cardName}`);
    console.log(`   Effect: ${cardInfo.effect}`);
    console.log(`   Cost: ${cardInfo.cost} mana`);
    
    // Execute card effect (simplified for MWE)
    this.executeCardEffect(cardName);
    
    // Move card to played pile
    this.playedCards.push(cardName);
    this.cardHand.splice(cardIndex, 1);
    
    console.log(`   Remaining hand: ${this.cardHand.length} cards`);
  }
  
  private executeCardEffect(cardName: string) {
    // Simple effect execution - could be expanded
    switch(cardName) {
      case "Lightning Bolt":
        console.log("   ⚡ Lightning strikes the battlefield!");
        this.createLightningEffect();
        break;
      case "Healing Potion":
        console.log("   💚 Health restored!");
        break;
      case "Frost Shield":
        console.log("   🛡️ Protective ice barrier formed!");
        break;
      case "Fire Storm":
        console.log("   🔥 Flames engulf the area!");
        this.createFireEffect();
        break;
      case "Time Warp":
        console.log("   ⏰ Time bends to your will!");
        break;
      case "Teleport":
        console.log("   🌀 You vanish and reappear elsewhere!");
        break;
      case "Summon Wolf":
        console.log("   🐺 A wolf appears at your side!");
        this.summonWolf();
        break;
      case "Meteor":
        console.log("   ☄️ A massive meteor crashes down!");
        this.createMeteorEffect();
        break;
    }
  }
  
  private createLightningEffect() {
    // Create some visual particles for lightning
    for (let i = 0; i < 5; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: 50 + Math.random() * 50, y: 30 + Math.random() * 20 },
            vel: { x: 0, y: -0.2 },
            radius: 1,
            lifetime: 30,
            color: "#FFD700",
            type: "lightning"
          }
        }
      });
    }
  }
  
  private createFireEffect() {
    // Create fire particles
    for (let i = 0; i < 8; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: 40 + Math.random() * 80, y: 25 + Math.random() * 30 },
            vel: { x: (Math.random() - 0.5) * 0.1, y: -0.15 },
            radius: 1.5,
            lifetime: 40,
            color: "#FF4500",
            type: "fire"
          }
        }
      });
    }
  }
  
  private summonWolf() {
    // Add a wolf unit to the simulation
    this.sim.addUnit({
      id: `wolf_${Date.now()}`,
      type: "wolf",
      pos: { x: 60 + Math.random() * 20, y: 40 + Math.random() * 10 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      state: "idle",
      sprite: "wolf",
      hp: 25,
      maxHp: 25,
      dmg: 6,
      mass: 3,
      abilities: [],
      tags: ["animal", "summoned"],
      meta: { facing: "right" }
    });
  }
  
  private createMeteorEffect() {
    // Create dramatic meteor particles
    for (let i = 0; i < 12; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: 20 + Math.random() * 100, y: 10 + Math.random() * 5 },
            vel: { x: (Math.random() - 0.5) * 0.3, y: 0.4 },
            radius: 2,
            lifetime: 60,
            color: "#FF6B35",
            type: "meteor"
          }
        }
      });
    }
  }
  
  private showHand() {
    console.log(`\\n🃏 Current Hand (${this.cardHand.length}/${this.maxCards}):`);
    if (this.cardHand.length === 0) {
      console.log("   (Empty)");
      return;
    }
    
    this.cardHand.forEach((card, index) => {
      const cardInfo = this.cardTypes[card];
      const rarityEmoji = this.getRarityEmoji(cardInfo.rarity);
      console.log(`   ${index + 1}. ${rarityEmoji} ${card} (${cardInfo.cost} mana)`);
      console.log(`      ${cardInfo.effect}`);
    });
  }
  
  private showPlayedCards() {
    console.log(`\\n📚 Played Cards (${this.playedCards.length}):`);
    if (this.playedCards.length === 0) {
      console.log("   (None played yet)");
      return;
    }
    
    // Group by card type
    const cardCounts = {};
    this.playedCards.forEach(card => {
      cardCounts[card] = (cardCounts[card] || 0) + 1;
    });
    
    Object.entries(cardCounts).forEach(([card, count]) => {
      const cardInfo = this.cardTypes[card];
      const rarityEmoji = this.getRarityEmoji(cardInfo.rarity);
      console.log(`   ${rarityEmoji} ${card} x${count}`);
    });
  }
  
  private getRarityEmoji(rarity: string): string {
    switch(rarity) {
      case "common": return "⚪";
      case "uncommon": return "🟢";
      case "rare": return "🔵";
      case "epic": return "🟣";
      case "legendary": return "🟠";
      default: return "⚫";
    }
  }
  
  private resetHand() {
    this.cardHand = [];
    this.playedCards = [];
    this.drawCooldown = 0;
    console.log("\\n🔄 Hand reset! Drawing new starting hand...");
    this.drawInitialHand();
    this.showHand();
  }
  
  getInputHandler(): (e: { key: string; type?: string }) => void {
    return (e) => {
      if (e.type !== 'keydown') return;
      
      const key = e.key.toLowerCase();
      
      switch(key) {
        case ' ':
          this.drawCard();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
          this.playCard(parseInt(key));
          break;
        case 'r':
          this.resetHand();
          break;
        case 'h':
          this.showHand();
          break;
        case 'p':
          this.showPlayedCards();
          break;
      }
    };
  }
  
  update() {
    super.update();
    
    // Update draw cooldown
    if (this.drawCooldown > 0) {
      this.drawCooldown--;
    }
  }

  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: CardDrawGame | null = null;
    const canvas =
      canvasId instanceof HTMLCanvasElement
        ? canvasId
        : (document.getElementById(canvasId) as HTMLCanvasElement);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string; type?: string }) => void) => {
        document.addEventListener("keydown", (e) => {
          cb({ key: e.key, type: 'keydown' });
        });
        document.addEventListener("keyup", (e) => {
          cb({ key: e.key, type: 'keyup' });
        });
      };

      game = new CardDrawGame(canvas, {
        addInputListener,
        animationFrame: (cb) => requestAnimationFrame(cb),
      });

      window.addEventListener("resize", () => {
        if (game && game.handleResize) {
          game.handleResize();
        }
      });

      if (game && game.handleResize) {
        game.handleResize();
      }

      game.bootstrap();
    } else {
      console.error(`Canvas element ${canvasId} not found!`);
    }
    
    function gameLoop() {
      if (game) {
        game.update();
      }
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
}

if (typeof window !== "undefined") {
  // @ts-ignore
  window.CardDrawGame = CardDrawGame;
  
  // Auto-boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CardDrawGame.boot());
  } else {
    CardDrawGame.boot();
  }
}