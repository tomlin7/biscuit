// Main extension host script for t3d.games
const GAMES = [
  { id: "tictactoe", title: "Tic-Tac-Toe" },
  { id: "gameoflife", title: "Game of Life" },
  { id: "minesweeper", title: "Minesweeper" },
  { id: "pong", title: "Pong" },
];

export function activate(t3d, context) {
  const openGame = (viewId, title) => {
    return t3d.commands.executeCommand(`t3d.extview.t3d.games.${viewId}`);
  };

  context.subscriptions.push(
    t3d.commands.registerCommand("t3d.games.pick", async () => {
      const titles = GAMES.map((g) => g.title);
      const choice = await t3d.window.showQuickPick(titles, {
        placeholder: "Select a game to play",
      });
      if (!choice) return;
      const game = GAMES.find((g) => g.title === choice);
      if (game) {
        await openGame(game.id, game.title);
      }
    })
  );

  for (const game of GAMES) {
    context.subscriptions.push(
      t3d.commands.registerCommand(`t3d.games.play.${game.id}`, () => {
        return openGame(game.id, game.title);
      })
    );
  }
}

export function deactivate() {}
