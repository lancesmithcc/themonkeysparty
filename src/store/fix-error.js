#!/bin/bash

# Create a backup first
cp src/store/gameStore.ts src/store/gameStore.ts.backup

# Now let's fix the error at line 2835
# The issue is that there's a function implementation with an if statement 
# that's immediately followed by object properties

# This sed script looks for the line with "if (isCollidingWithTV..." and then
# handles the next lines appropriately, adding proper syntax to complete the function
sed -i.bak '
/if (isCollidingWithTV/ {
  # Add a closing curly brace and reverse direction code to properly close the if statement
  a\
        // Reverse direction if hitting the TV\
        set({\
          npcMoveDirection: new THREE.Vector3(\
            -state.npcMoveDirection.x,\
            0,\
            -state.npcMoveDirection.z\
          )\
        });\
        return;\
      }
}
' src/store/gameStore.ts

echo "Fix applied to src/store/gameStore.ts"
echo "Original file backed up as src/store/gameStore.ts.backup" 