  setSecondNpcHit: () => set({ isSecondNpcHit: true, secondNpcHitTime: Date.now() }),
  
  // Implementation for collecting mushrooms and updating scores
  collectMushroom: (id: number, collector: string) => {
    const { mushrooms, playerScore, npcScore, secondNpcScore, mushroomsCollectedSinceLastEyeball } = get();
    
    const mushroomToCollect = mushrooms.find(m => m.id === id);
    const wasAlreadyCollected = mushroomToCollect?.collected || false;
    
    const updatedMushrooms = mushrooms.map(mushroom => {
      if (mushroom.id === id && !mushroom.collected) {
        return { ...mushroom, collected: true, collectedBy: collector };
      }
      return mushroom;
    });
    
    let updatedPlayerScore = playerScore;
    let updatedNpcScore = npcScore;
    let updatedSecondNpcScore = secondNpcScore;
    
    const bonusPoints = Math.floor(Math.random() * (MUSHROOM_BONUS_MAX - MUSHROOM_BONUS_MIN + 1)) + MUSHROOM_BONUS_MIN;
    const totalPoints = MUSHROOM_POINTS + bonusPoints;
    
    if (collector === "player") {
      updatedPlayerScore += totalPoints;
    } else if (collector === "npc") {
      updatedNpcScore += totalPoints;
    } else if (collector === "secondNpc") {
      updatedSecondNpcScore += totalPoints;
    }
    
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
    
    if (newMushroomCount >= MUSHROOMS_PER_EYEBALL) {
      get().trySpawnEyeball();
    }
  }
})); 