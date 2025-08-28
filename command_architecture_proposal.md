# Command Architecture Proposal - Router Pattern

## Current State
- 49 command classes
- Many duplicates/aliases
- Some commands directly manipulate sim, others use Transform

## Proposed Architecture

### 1. Router Commands
High-level commands that route to specific implementations:

```typescript
// Example: ScalarFieldCommand routes to specific field manipulations
class ScalarFieldCommand extends Command {
  execute(unitId: string | null, params: CommandParams) {
    const field = params.field as "temperature" | "humidity" | "pressure";
    const operation = params.operation as "set" | "add" | "gradient";
    
    switch(field) {
      case "temperature":
        this.routeToTemperature(params);
        break;
      case "humidity":
        this.routeToHumidity(params);
        break;
      // etc
    }
  }
}
```

### 2. Command Hierarchy

```
Command (base)
├── ScalarFieldCommand (router)
│   ├── Temperature
│   ├── Humidity
│   └── Pressure
├── WeatherCommand (router)
│   ├── Rain
│   ├── Storm
│   └── Clear
├── UnitCommand (router)
│   ├── Spawn
│   ├── Remove
│   └── Transform
├── MovementCommand (router)
│   ├── Move
│   ├── Jump
│   ├── Toss
│   └── Knockback
└── CombatCommand (router)
    ├── Strike
    ├── Projectile
    └── AoE
```

### 3. Benefits
- Clear organization
- Easy to extend
- Consistent interface
- Can still have shortcuts (temp -> ScalarFieldCommand with field:"temperature")

### 4. Implementation Steps
1. Keep existing commands working
2. Introduce routers gradually
3. Migrate commands under routers
4. Remove duplicates

## Example Usage

```typescript
// Direct command
sim.queueCommand("temp", { x: 5, y: 5, amount: 10 });

// Router command  
sim.queueCommand("scalar", { 
  field: "temperature", 
  x: 5, 
  y: 5, 
  amount: 10 
});

// Both work, second is more explicit
```