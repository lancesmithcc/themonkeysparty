/**
 * Implementation of collectMushroom function for gameStore.ts
 * 
 * This function should be added to the gameStore.ts file within the 
 * create<GameState>((set, get) => ({ ... })) section. 
 * Add this before the closing bracket.
 */

collectMushroom: (id: number, collector: string) => {
  const { 
    mushrooms, 
    playerScore, 
    npcScore, 
    secondNpcScore,
    mushroomsCollectedSinceLastEyeball 
  } = get();
  
  // Find the mushroom to check if it was already collected
  const mushroomToCollect = mushrooms.find(m => m.id === id);
  const wasAlreadyCollected = mushroomToCollect?.collected || false;
  
  const updatedMushrooms = mushrooms.map(mushroom => {
    if (mushroom.id === id && !mushroom.collected) {
      return {
        ...mushroom,
        collected: true,
        collectedBy: collector
      };
    }
    return mushroom;
  });
  
  // Update scores based on who collected the mushroom
  let updatedPlayerScore = playerScore;
  let updatedNpcScore = npcScore;
  let updatedSecondNpcScore = secondNpcScore;
  
  // Calculate random bonus points for more exciting rewards
  const bonusPoints = Math.floor(Math.random() * 
    (MUSHROOM_BONUS_MAX - MUSHROOM_BONUS_MIN + 1)) + MUSHROOM_BONUS_MIN;
  const totalPoints = MUSHROOM_POINTS + bonusPoints;
  
  // Award points based on the collector
  if (collector === 'player') {
    updatedPlayerScore += totalPoints;
  } else if (collector === 'npc') {
    updatedNpcScore += totalPoints;
  } else if (collector === 'secondNpc') {
    updatedSecondNpcScore += totalPoints;
  }
  
  // Only increment counter if this was a new collection
  let newMushroomCount = mushroomsCollectedSinceLastEyeball;
  if (!wasAlreadyCollected) {
    newMushroomCount += 1;
    console.log(`Mushrooms collected: ${newMushroomCount}/${MUSHROOMS_PER_EYEBALL}`);
  }
  
  set({
    mushrooms: updatedMushrooms,
    playerScore: updatedPlayerScore,
    npcScore: updatedNpcScore,
    secondNpcScore: updatedSecondNpcScore,
    mushroomsCollectedSinceLastEyeball: newMushroomCount
  });
  
  // Try to spawn an eyeball immediately if we've hit the threshold
  if (newMushroomCount >= MUSHROOMS_PER_EYEBALL) {
    get().trySpawnEyeball();
  }
}, 