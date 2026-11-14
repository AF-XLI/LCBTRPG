{
  "lcb": {
    "name": "LCB囚人",
    "affiliation": "ルナリスカンパニー",
    "rarity": "1",
    "hp": 270,
    "speed": [
      2,
      4
    ],
    "thr": [
      50,
      25
    ],
    "resist": {
      "slash": 2,
      "pierce": 1,
      "blunt": 0.5
    },
    "skills": [
      {
        "tier": 1,
        "sin": "sloth",
        "type": "blunt",
        "name": "叩く",
        "base": 5,
        "coin": 6,
        "coins": 1,
        "effects": [
          {
            "coin": 1,
            "timing": "hit",
            "type": "gain",
            "status": "charge",
            "count": 2,
            "target": "self"
          }
        ]
      },
      {
        "tier": 2,
        "sin": "envy",
        "type": "blunt",
        "name": "もっと叩く",
        "base": 6,
        "coin": 10,
        "coins": 1,
        "effects": [
          {
            "coin": 1,
            "timing": "hit",
            "type": "gain",
            "status": "charge",
            "count": 2,
            "target": "self"
          },
          {
            "coin": 1,
            "timing": "hit",
            "type": "grant",
            "status": "bind",
            "power": 2,
            "ifStatus": {
              "status": "charge",
              "op": "gte",
              "value": 8
            }
          }
        ]
      },
      {
        "tier": 3,
        "sin": "gluttony",
        "type": "blunt",
        "name": "振りかぶる",
        "base": 8,
        "coin": 10,
        "coins": 1,
        "effects": [
          {
            "timing": "use",
            "type": "spend",
            "status": "charge",
            "max": 15
          },
          {
            "timing": "use",
            "type": "spentDmg",
            "status": "charge",
            "per": 1,
            "percent": 2
          },
          {
            "timing": "use",
            "type": "spentCoin",
            "status": "charge",
            "per": 3,
            "amount": 1
          },
          {
            "coin": 1,
            "timing": "hit",
            "type": "grant",
            "target": "self",
            "delay": "nextTurn",
            "status": "protect",
            "power": 2,
            "ifSpent": {
              "op": "gte",
              "value": 10
            }
          }
        ]
      }
    ],
    "passive": {
      "name": "ウサギを追いかけて",
      "sin": "gluttony",
      "count": 3,
      "effects": [
        {
          "type": "spendReward",
          "status": "charge",
          "every": 10,
          "reward": {
            "status": "charge",
            "power": 1
          }
        },
        {
          "type": "matchBonus",
          "percentPer": 3,
          "max": 15
        }
      ]
    },
    "support": {
      "name": "ティーパーティー",
      "sin": "gluttony",
      "count": 4,
      "effects": [
        {
          "timing": "battleStart",
          "type": "hpHeal",
          "amount": 5
        }
      ]
    },
    "defense": {
      "sin": "gluttony",
      "type": "counter",
      "damage": "blunt",
      "name": "反撃",
      "base": 6,
      "coin": 6,
      "coins": 1,
      "effects": [
        {
          "coin": 1,
          "timing": "hit",
          "type": "gain",
          "status": "charge",
          "count": 4,
          "target": "self"
        }
      ]
    }
  }
}
