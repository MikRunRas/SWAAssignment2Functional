export type Generator<T> = { next: () => T };

export type Position = {
  row: number;
  col: number;
};

export type Match<T> = {
  matched: T;
  positions: Position[];
};

export type Board<T> = {
  sequenceGenerator: Generator<T>;
  boardState: T[][];
  width: number;
  height: number;
};

export type Effect<T> = { kind: "Refill" } | { kind: "Match"; match: Match<T> };

export type MoveResult<T> = {
  board: Board<T>;
  effects: Effect<T>[];
};

export function create<T>(
  generator: Generator<T>,
  w: number,
  h: number
): Board<T> {
  function createEmptyBoard(): T[][] {
    let state: T[][] = [];

    // Loop through number of Columns
    for (let col = 0; col < w; col++) {
      // Create an Empty Column
      let column: T[] = [];

      // Loop through number of Rows
      for (let row = 0; row < h; row++) {
        // Add NULL to the Column
        column.push(null);
      }

      // Add Columm to the state
      state.push(column);
    }

    return state;
  }

  function populateBoard(board: T[][]): T[][] {
    let newBoard: T[][] = board.slice();

    // Loop through Board State, row -> col, col, [...]
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        // Return if Piece already exists
        if (board[col][row] !== null) continue;

        // Set the Piece
        let nextPiece = generator.next();
        newBoard[col][row] = nextPiece;
      }
    }

    return newBoard;
  }

  // Return the Board
  return {
    // Field: Value
    sequenceGenerator: generator,
    boardState: populateBoard(createEmptyBoard()),
    width: w,
    height: h,
  };
}

export function piece<T>(board: Board<T>, p: Position): T | undefined {
  // Check for Out Of Bounds (OOB)
  if (p.row < 0 || p.col < 0 || p.row >= board.height || p.col >= board.width) {
    return undefined;
  }

  // Get the BoardState
  let boardState = board.boardState;

  // Retrieve Piece from BoardState
  let piece = boardState[p.col][p.row];

  // Return Piece
  return piece;
}

export function canMove<T>(
  board: Board<T>,
  first: Position,
  second: Position
): boolean {
  function illegalMoves(): boolean {
    let piece1 = piece(board, first);
    let piece2 = piece(board, second);
    if (piece1 === undefined || piece2 === undefined) return true;

    const c1 = first.col,
      c2 = second.col,
      r1 = first.row,
      r2 = second.row;

    // Return true if not in a Cardinal Direction
    if (c1 != c2 && r1 != r2) return true;

    // Calculate Difference between Columns && Rows && Magic (Maths)
    const c_diff = c1 - c2,
      r_diff = r1 - r2;

    return c_diff == 0 && r_diff == 0;
  }

  function legalMoves(): boolean {
    // Perform a Swap to check for possible matches
    let simulatedBoard: T[][] = swapPieces(board.boardState, first, second);

    // Check if Any Matches are found
    if (
      anyMatching(simulatedBoard, first) == "None" &&
      anyMatching(simulatedBoard, second) == "None"
    ) {
      // No Matches Found
      return false;
    }

    return true;
  }

  if (illegalMoves()) return false;
  return legalMoves();
}

function anyMatching<T>(
  board: T[][],
  p: Position
): "Horizontal" | "Vertical" | "Both" | "None" {
  // Reference Vectors
  const [n, e, s, w]: Position[] = [
    { row: -1, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
  ];

  let referencePiece = getPiece(board, p);

  // Check if there are any matches
  let match_WE =
    checkNext(board, referencePiece, p, w) +
    checkNext(board, referencePiece, p, e) -
    1; // -1 to ensure the piece itself isn't counted twice
  let match_NS =
    checkNext(board, referencePiece, p, n) +
    checkNext(board, referencePiece, p, s) -
    1; // -1 to ensure the piece itself isn't counted twice

  if (match_WE >= 3 && match_NS >= 3) return "Both";
  if (match_WE >= 3) return "Horizontal";
  if (match_NS >= 3) return "Vertical";
  return "None";
}

function checkNext<T>(
  board: T[][],
  reference: T,
  current: Position,
  direction: Position
): number {
  // Get the Piece at the current Position
  let currentPiece = getPiece(board, current);

  // Chec if the Piece matches the Reference Piece
  if (currentPiece == reference) {
    // Calculate the next position
    const newPos: Position = {
      col: current.col + direction.col,
      row: current.row + direction.row,
    };

    // Recursion to get multiple pieces
    return 1 + checkNext(board, reference, newPos, direction);
  } else {
    return 0;
  }
}

function swapPieces<T>(board: T[][], p1: Position, p2: Position): T[][] {
  // Copy the Board
  let swappedBoard: T[][] = board.map((arr) => arr.slice());

  // Perform Swap
  let tmp: T = getPiece(swappedBoard, p1);
  swappedBoard[p1.col][p1.row] = getPiece(swappedBoard, p2);
  swappedBoard[p2.col][p2.row] = tmp;

  // Return the board
  return swappedBoard;
}

export function move<T>(
  generator: Generator<T>,
  board: Board<T>,
  first: Position,
  second: Position
): MoveResult<T> {
  let result: MoveResult<T>;

  // Return Null if a Move is not allowed
  if (!canMove(board, first, second)) {
    result = { board: board, effects: [] };

    return result;
  }

  // Create the board with the pieces swapped
  let newBoardState: T[][] = swapPieces(board.boardState, first, second);

  // Update the Board with the new State
  board.boardState = newBoardState;

  // Create Variables
  let matched: T;
  let matches: Position[];
  let effects: Effect<T>[] = [];
  let match: Match<T>;

  // Check for Matches on First Position
  let dir = anyMatching(newBoardState, first);

  if (dir == "Both") {
    effects.push(getMatchesFor(newBoardState, first, "Horizontal", matched));
    effects.push(getMatchesFor(newBoardState, first, "Vertical", matched));
  } else {
    effects.push(getMatchesFor(newBoardState, first, dir, matched));
  }

  // Check for Matches on Second Position
  dir = anyMatching(newBoardState, second);

  if (dir == "Both") {
    effects.push(getMatchesFor(newBoardState, second, "Horizontal", matched));
    effects.push(getMatchesFor(newBoardState, second, "Vertical", matched));
  } else {
    effects.push(getMatchesFor(newBoardState, second, dir, matched));
  }

  // Add Matches to Effect
  match = { matched: matched, positions: matches };
  effects.push({ kind: "Match", match: match });

  // Create Move Result
  result = { board: board, effects: effects };

  // Return Statement
  return result;
}

function getMatchesFor<T>(
  newBoardState: T[][],
  pos: Position,
  dir: "Vertical" | "Horizontal" | "None",
  matched: T
) {
  let matchEvents: Effect<T>;

  if (dir != "None") {
    // Get Matches
    matched = getPiece(newBoardState, pos);
    let matches = getMatches(newBoardState, dir, pos);

    // Add Matches to Effect
    let match = { matched: matched, positions: matches };
    matchEvents = { kind: "Match", match: match };
  }
  return matchEvents;
}

function getMatches<T>(
  board: T[][],
  direction: "Vertical" | "Horizontal",
  referencePosition: Position
): Position[] {
  function getFirstInDirection(
    board: T[][],
    p: Position,
    d: "Vertical" | "Horizontal",
    reference: T
  ): Position {
    let dir: Position = directionToVector(d, true); // Vector Direction towards start of chain

    // Loop through pieces until the next does not match
    dir = checkNextIs(board, p, dir, reference);

    return dir;
  }

  function checkNextIs(
    board: T[][],
    p: Position,
    dir: Position,
    reference: T
  ): Position {
    let newPos: Position = {
      col: p.col + dir.col,
      row: p.row + dir.row,
    };

    // Get Next Piece
    let actualPiece: T = getPiece(board, newPos);

    // Check if Piece Matches
    if (actualPiece != reference) {
      // Return position if it does not match
      return p;
    } else {
      return checkNextIs(board, newPos, dir, reference);
    }
  }

  function getMatching(
    b: T[][],
    p: Position,
    dir: "Vertical" | "Horizontal",
    r: T
  ): Position[] {
    // Empty Array to fill
    let matching: Position[] = [];

    // Direction
    let d = directionToVector(dir);

    addNext(board, p, d, r, matching);

    return matching;
  }

  function addNext(
    board: T[][],
    current: Position,
    dir: Position,
    reference: T,
    matchList: Position[]
  ) {
    // Next Position
    let n: Position = {
      col: current.col + dir.col,
      row: current.row + dir.row,
    };

    // Add to List
    matchList.push(current);

    // Recursive Checks
    if (getPiece(board, n) == reference)
      addNext(board, n, dir, reference, matchList);
  }

  function directionToVector(
    d: "Vertical" | "Horizontal",
    reverse: boolean = false
  ) {
    // Get Direction as a Vector
    const scale = reverse ? -1 : 1;
    switch (d) {
      case "Vertical":
        return { col: 0, row: scale };
      case "Horizontal":
        return { col: scale, row: 0 };
      default:
        throw Error(`Direction (${d}) neither Horizontal or Vertical`);
    }
  }

  // Get Reference Piece
  let piece: T = getPiece(board, referencePosition);

  // Get First Position in Line
  let firstInDir: Position = getFirstInDirection(
    board,
    referencePosition,
    direction,
    piece
  );

  // Get remaining positions
  let matches: Position[] = getMatching(board, firstInDir, direction, piece);

  return matches;
}

/**
 * Get all Positions as a Position[], (row 0, col 0 -> MAX), (row 1, col 0 -> MAX)
 *
 * @param board Board to get positions for
 * @returns List of Positons
 */
export function positions<T>(board: Board<T>): Position[] {
  let positions: Position[] = [];

  // Loop through all Rows
  for (let y = 0; y < board.height; y++) {
    // Loop through all Columnss
    for (let x = 0; x < board.width; x++) {
      // Create a new Position
      let position: Position = { col: x, row: y };

      // Add Position to the list of Positions
      positions.push(position);
    }
  }

  // Return
  return positions;
}

function getPiece<T>(board: T[][], p: Position): T | undefined {
  if (
    p.col < 0 ||
    p.row < 0 ||
    board.length <= p.col ||
    board[0].length <= p.row
  ) {
    // Out Of Bounds
    return undefined;
  }

  // Inside Bounds
  return board[p.col][p.row];
}
