/**
 * 数独技巧教学数据 - 12种从易到难的解题技巧
 */
const Techniques = {
  list: [
    {
      id: 'naked-single',
      name: '唯余数',
      en: 'Naked Single',
      difficulty: 'easy',
      icon: '1️⃣',
      description: '当一个单元格只剩下一个可能的数字时，直接填入该数字。这是最基本的数独技巧。',
      howTo: '查看某个空格的候选数，如果只剩一个，那这个数字就是答案。',
      example: {
        description: '观察 R5C5，它所在的行、列、宫已经包含了 1,2,3,4,6,7,8,9，只有 5 是可能的，因此 R5C5 一定是 5。',
        cells: [
          { row: 4, col: 4, value: 5, highlight: true },
          { row: 4, col: 0, value: 1 }, { row: 4, col: 1, value: 2 }, { row: 4, col: 2, value: 3 },
          { row: 4, col: 6, value: 7 }, { row: 4, col: 7, value: 8 }, { row: 4, col: 8, value: 9 },
          { row: 0, col: 4, value: 4 }, { row: 8, col: 4, value: 6 },
          { row: 3, col: 3, value: 4 },
        ]
      },
      detail: '唯余数是数独最基础的技巧，核心思想是：对某个单元格，排除其同行、同列、同宫中已经出现的所有数字，如果只剩下一个可能，那这个数字就是唯一解。这是其他所有高级技巧的基础。'
    },
    {
      id: 'hidden-single',
      name: '隐式唯一',
      en: 'Hidden Single',
      difficulty: 'easy',
      icon: '2️⃣',
      description: '在某一行/列/宫内，某个数字只能出现在一个单元格中，则该单元格必然是这个数字。',
      howTo: '逐行/列/宫扫描 1-9 每个数字，看它在该单元内的可能位置。如果只有一个可能位置，那就是答案。',
      example: {
        description: '在第 3 宫中，数字 7 只能出现在 R1C7（因为第 7、8 列已有 7，R3C9 被其他数字占据），所以 R1C7 = 7。',
        cells: [
          { row: 0, col: 6, value: 7, highlight: true },
          { row: 0, col: 7, value: 1 }, { row: 0, col: 8, value: 2 },
          { row: 1, col: 6, value: 3 }, { row: 1, col: 7, value: 4 }, { row: 1, col: 8, value: 5 },
          { row: 2, col: 6, value: 6 }, { row: 2, col: 7, value: 8 }, { row: 2, col: 8, value: 9 },
        ]
      },
      detail: '隐式唯一需要扫描每个数字在行/列/宫中的分布。如果一个数字在某个单元内只有一个可能位置，那么即使该单元格还有别的候选数，也必须填入这个数字。它是"隐式"的，因为不看候选数的话你可能不知道这个单元格只有这一个选择。'
    },
    {
      id: 'naked-pair',
      name: '显式数对',
      en: 'Naked Pair',
      difficulty: 'medium',
      icon: '3️⃣',
      description: '如果同一行/列/宫内有两个单元格都只有相同的两个候选数，则这两个数字不会出现在该单元的其他位置。',
      howTo: '在一行/列/宫中找到两个格子，它们的候选数完全一样且只有两个。那么这两个数字就可以从该单元的其他格子候选数中删除。',
      example: {
        description: '在第 1 行中，R1C2 和 R1C5 的候选数都是 {3,7}。那么 3 和 7 只能在这两个位置，可以从该行其他单元格删除候选数 3 和 7。',
        cells: [
          { row: 0, col: 1, note: '3,7', highlight: true },
          { row: 0, col: 4, note: '3,7', highlight: true },
        ]
      },
      detail: '显式数对的关键在于：两个格子"拿走了"两个数字的所有可能位置，因此这两个数字不能出现在同一单元的其他位置。这个技巧可以帮你消除大量候选数。'
    },
    {
      id: 'hidden-pair',
      name: '隐式数对',
      en: 'Hidden Pair',
      difficulty: 'medium',
      icon: '4️⃣',
      description: '如果某一行/列/宫内，有两个数字只能出现在相同的两个单元格中，则这两个单元格的其他候选数都可以删除。',
      howTo: '在一行/列/宫中找出两个数字，它们都只能出现在两个特定的单元格中。那么这两个单元格就是它们的专属位置，其他候选数可以放心移除。',
      example: {
        description: '在第 3 列中，数字 2 和 8 只能出现在 R4C3 和 R7C3 中。虽然这两个格子还有其他候选数，但 2 和 8 必然占据它们，可以删除其他候选数。',
        cells: [
          { row: 3, col: 2, note: '2,8', highlight: true },
          { row: 6, col: 2, note: '2,8', highlight: true },
        ]
      },
      detail: '隐式数对比显式数对更难发现，因为你需要扫描数字的分布。它的威力在于：即使这两个格子还有很多候选数，一旦确认了隐式数对，就能大幅缩小候选范围。'
    },
    {
      id: 'pointing-pair',
      name: '指向数对',
      en: 'Pointing Pair',
      difficulty: 'medium',
      icon: '5️⃣',
      description: '如果一个数字在某个宫中的候选位置都在同一行或同一列，则该数字可以从该行/列的其他宫中删除。',
      howTo: '查看每个宫中每个数字的候选位置。如果某个数字在同一行/列对齐，就可以删除同行/列其他宫中的该候选数。',
      example: {
        description: '在第 4 宫中，数字 5 的候选位置都在第 5 行（R5C1 和 R5C2）。那么第 5 行中其他宫的格子里就不能有 5（可以删除 R5C456789 中的候选数 5）。',
        cells: [
          { row: 4, col: 0, note: '5', highlight: true },
          { row: 4, col: 1, note: '5', highlight: true },
        ]
      },
      detail: '指向数对利用的是宫的"覆盖范围"。当一个数字在宫内被限制在某一行/列时，它就在该行/列"指向"了宫外，其他宫的同行的 5 候选就可以被删除。'
    },
    {
      id: 'box-line-reduction',
      name: '区块删减法',
      en: 'Box/Line Reduction',
      difficulty: 'medium',
      icon: '6️⃣',
      description: '如果某行/列中某个数字的候选位置都在同一个宫内，则该宫内其他行/列的该候选数可以删除。',
      howTo: '这是指向数对的反向操作：在一行/列中，如果一个数字的候选都集中在同一个宫里，那么这个宫的其他行/列不能再有该数字。',
      example: {
        description: '在第 2 行中，数字 4 的候选位置都在第 1 宫（C1 和 C3）。那么第 1 宫中不在第 2 行的格子里就不能有候选数 4。',
        cells: [
          { row: 1, col: 0, note: '4', highlight: true },
          { row: 1, col: 2, note: '4', highlight: true },
        ]
      },
      detail: '区块删减法（也称指向删减法）非常实用。它从行/列的角度出发，当你发现某个数字被限制在某个宫的某行时，就可以在宫内消除其他行的该候选。'
    },
    {
      id: 'naked-triple',
      name: '显式三数组',
      en: 'Naked Triple',
      difficulty: 'hard',
      icon: '7️⃣',
      description: '如果同一行/列/宫内有三个单元格，它们的候选数合起来只有三个数字，则这三个数字不会出现在该单元的其他位置。',
      howTo: '在一行/列/宫中找到三个格子，它们的候选数集合不超过三个数字（每个格子不需要全部包含三个数字）。这三个数字就可以从该单元的其他格子中删除。',
      example: {
        description: '在第 7 行中，R7C1 候选 {2,5}，R7C4 候选 {5,8}，R7C8 候选 {2,8}。这三个格子合起来只有 {2,5,8}，因此可以删除该行其他格子中的 2、5、8 候选。',
        cells: [
          { row: 6, col: 0, note: '2,5', highlight: true },
          { row: 6, col: 3, note: '5,8', highlight: true },
          { row: 6, col: 7, note: '2,8', highlight: true },
        ]
      },
      detail: '显式三数组是显式数对的推广。三个格子不一定要都有三个候选数，只要它们的候选数集合合起来不超过三个数字即可。这通常能带来可观的候选数消除。'
    },
    {
      id: 'hidden-triple',
      name: '隐式三数组',
      en: 'Hidden Triple',
      difficulty: 'hard',
      icon: '8️⃣',
      description: '如果在一行/列/宫中，有三个数字只能出现在相同的三个单元格中，则这些单元格的其他候选数可以删除。',
      howTo: '在一行/列/宫中找出三个数字，它们都只能出现在三个特定的单元格中。虽然这些格子可能还有其他候选数，但确认隐式三数组后，多余的候选数就可以删除。',
      example: {
        description: '在第 5 列中，数字 1、4、9 只能出现在 R2C5、R6C5、R8C5 中。那么这三个格子的其他候选数都可以删除。',
        cells: [
          { row: 1, col: 4, note: '1,4,9', highlight: true },
          { row: 5, col: 4, note: '1,4,9', highlight: true },
          { row: 7, col: 4, note: '1,4,9', highlight: true },
        ]
      },
      detail: '隐式三数组非常隐蔽。三个数字不一定要在每个格子中都出现，只要它们都"只能"在这三个格子中就可以。这是进阶玩家的利器。'
    },
    {
      id: 'x-wing',
      name: 'X翼',
      en: 'X-Wing',
      difficulty: 'hard',
      icon: '9️⃣',
      description: '当某个数字在两行中都只能出现在相同的两列时，这两列的其他行中该数字的候选都可以删除（反之亦然）。',
      howTo: '扫描 1-9 每个数字，看它在哪些行/列中只出现两次且列位置相同。如果找到这样的行对，就可以在对应的列中消除该候选数。',
      example: {
        description: '数字 6 在第 2 行只能出现在 C3 和 C7，在第 8 行也只能出现在 C3 和 C7。形成 X-Wing 结构，可以删除 C3 和 C7 列其他行中的候选数 6。',
        cells: [
          { row: 1, col: 2, note: '6', highlight: true },
          { row: 1, col: 6, note: '6', highlight: true },
          { row: 7, col: 2, note: '6', highlight: true },
          { row: 7, col: 6, note: '6', highlight: true },
        ]
      },
      detail: 'X-Wing 是数独中最经典的进阶技巧之一。想象四格形成一个矩形，无论这个数字最终落在两行中的哪一列，该列的其他行都不可能有这个数字。这就是 X-Wing 的逻辑威力。'
    },
    {
      id: 'swordfish',
      name: '剑鱼',
      en: 'Swordfish',
      difficulty: 'hard',
      icon: '🔟',
      description: 'X-Wing 的三行/三列推广。当某个数字在三行中都只能出现在相同的三列时，这三列的其他行中该数字的候选都可以删除。',
      howTo: '寻找三行/列的组合，其中某个数字的候选位置恰好落在三列/行上。形成剑鱼结构后，可以在对应的列/行中消除该候选。',
      example: {
        description: '数字 3 在第 1、5、9 行中的候选位置都落在 C2、C6、C8 列中，形成 Swordfish 结构，可以删除这三列其他行中的候选数 3。',
        cells: [
          { row: 0, col: 1, note: '3' }, { row: 0, col: 5, note: '3' },
          { row: 4, col: 1, note: '3' }, { row: 4, col: 5, note: '3' },
          { row: 8, col: 1, note: '3' }, { row: 8, col: 7, note: '3' },
        ]
      },
      detail: '剑鱼（Swordfish）是 X-Wing 的三维推广，虽然不如 X-Wing 常见，但它是高级玩家的必备技能。可以用它来突破困难的卡点。'
    },
    {
      id: 'xy-wing',
      name: 'XY翼',
      en: 'XY-Wing',
      difficulty: 'expert',
      icon: '🔢',
      description: '一个双值格子(枢轴)连接另外两个双值格子(翼)，三者共享候选数形成 Y 型结构，可删除两翼共同影响格中的特定候选数。',
      howTo: '找到三个双值格子，其中枢轴的候选为 (X,Y)，两翼分别包含 (X,Z) 和 (Y,Z)。那么两翼都能看到的所有格子中不能有 Z。',
      example: {
        description: '枢轴 R3C3 候选 {2,5}，连接 R3C8 候选 {5,8} 和 R6C3 候选 {2,8}。两翼共同看到的 R6C8 如果有候选数 8 就必须删除。',
        cells: [
          { row: 2, col: 2, note: '2,5', highlight: true },
          { row: 2, col: 7, note: '5,8', highlight: true },
          { row: 5, col: 2, note: '2,8', highlight: true },
          { row: 5, col: 7, value: 8, strike: true },
        ]
      },
      detail: 'XY-Wing 是非常优雅的技巧。它不依赖于行/列/宫的约束，而是通过三个双值格子的逻辑链来推导。掌握这个技巧意味着你已经进入了高级数独的门槛。'
    },
    {
      id: 'xyz-wing',
      name: 'XYZ翼',
      en: 'XYZ-Wing',
      difficulty: 'expert',
      icon: '🎯',
      description: 'XY-Wing 的变体，其中枢轴是一个三值格子(X,Y,Z)，两翼分别是 (X,Z) 和 (Y,Z)。可删除三格共同影响位置中的 Z。',
      howTo: '找到三值格子作为枢轴，以及两个双值翼格子。搜索三格都能看到的单元格中的候选数 Z 并删除。',
      example: {
        description: '枢轴 R4C4 候选 {2,5,7}，连接 R4C1 候选 {2,7} 和 R7C4 候选 {5,7}。删除三格共同影响单元格（如 R4C4 宫的同事和行列交集处）的候选数 7。',
        cells: [
          { row: 3, col: 3, note: '2,5,7', highlight: true },
          { row: 3, col: 0, note: '2,7', highlight: true },
          { row: 6, col: 3, note: '5,7', highlight: true },
        ]
      },
      detail: 'XYZ-Wing 是 XY-Wing 的自然推广。枢轴从双值变成三值，但逻辑本质相同：无论枢轴取什么值，Z 都会从共同影响的格子中消失。'
    },
  ],

  getById(id) {
    return this.list.find(t => t.id === id);
  },

  getByDifficulty(diff) {
    return this.list.filter(t => t.difficulty === diff);
  },

  getDifficultyLabel(diff) {
    const map = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };
    return map[diff] || diff;
  }
};
