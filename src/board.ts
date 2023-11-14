import { transformFileSync } from "@babel/core";

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

export function create<T>(generator: Generator<T>, w: number, h: number): Board<T> {
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

  // Return the Board
  return {
    // Field: Value
    sequenceGenerator: generator,
    boardState: populateBoard(createEmptyBoard(), generator),
    width: w,
    height: h,
  };
}

function populateBoard<T>(board: T[][], generator: Generator<T>): T[][] {
  let newBoard: T[][] = board.slice();

  // Loop through Board State, row -> col, col, [...]
  for (let row = 0; row < newBoard[0].length; row++) {
    for (let col = 0; col < newBoard.length; col++) {
      // Return if Piece already exists
      if (board[col][row] !== null) continue;

      // Set the Piece
      let nextPiece = generator.next();
      newBoard[col][row] = nextPiece;
    }
  }

  return newBoard;
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

export function canMove<T>(board: Board<T>, first: Position, second: Position): boolean {
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
    if (anyMatchingOn(simulatedBoard, first) == "None" && anyMatchingOn(simulatedBoard, second) == "None") {
      // No Matches Found
      return false;
    }

    return true;
  }

  if (illegalMoves()) return false;
  return legalMoves();
}

function anyMatchingOn<T>(board: T[][], p: Position): "Horizontal" | "Vertical" | "Both" | "None" {
  // Reference Vectors
  const [n, e, s, w]: Position[] = [
    { row: -1, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
  ];

  let referencePiece = getPiece(board, p);

  // Check if there are any matches
  let match_WE = checkNext(board, referencePiece, p, w) + checkNext(board, referencePiece, p, e) - 1; // -1 to ensure the piece itself isn't counted twice
  let match_NS = checkNext(board, referencePiece, p, n) + checkNext(board, referencePiece, p, s) - 1; // -1 to ensure the piece itself isn't counted twice

  if (match_WE >= 3 && match_NS >= 3) return "Both";
  if (match_WE >= 3) return "Horizontal";
  if (match_NS >= 3) return "Vertical";
  return "None";
}

function checkNext<T>(board: T[][], reference: T, current: Position, direction: Position): number {
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

export function move<T>(generator: Generator<T>, board: Board<T>, first: Position, second: Position): MoveResult<T> {
  function checkFor(cf_pos: Position) {
    let cf_direction: "None" | "Horizontal" | "Vertical" | "Both";

    cf_direction = anyMatchingOn(m_newBoardState, cf_pos);
    if (cf_direction != "None") {
      if (cf_direction == "Both") {
        // Get the Horizontal & Vertical Matches
        let cf_horizontalMatches: Effect<T> = getMatchEvent(m_newBoardState, cf_pos, "Horizontal", m_matched);
        let cf_verticalMatches: Effect<T> = getMatchEvent(m_newBoardState, cf_pos, "Vertical", m_matched);

        // Push the Matches to the Effects
        m_effects.push(cf_horizontalMatches);
        m_effects.push(cf_verticalMatches);

        // Get the Matches' Positions
        m_matches = getMatchPositions(m_newBoardState, "Horizontal", cf_pos);
        m_matches = m_matches.concat(getMatchPositions(m_newBoardState, "Vertical", cf_pos));
      } else {
        m_effects.push(getMatchEvent(m_newBoardState, cf_pos, cf_direction, m_matched));
        if (m_matches === undefined) {
          m_matches = getMatchPositions(m_newBoardState, cf_direction, cf_pos);
        } else {
          m_matches = m_matches.concat(getMatchPositions(m_newBoardState, cf_direction, cf_pos));
        }
      }
    }
  }

  function anyMatching(am_board: Board<T>): boolean {
    let am_positions: Position[] = positions(am_board);

    for (const am_pos of am_positions) {
      if (anyMatchingOn(am_board.boardState, am_pos) != "None") return true;
    }

    return false;
  }

  let m_result: MoveResult<T>;

  // Return Null if a Move is not allowed
  if (!canMove(board, first, second)) {
    m_result = { board: board, effects: [] };

    return m_result;
  }

  // Create the board with the pieces swapped
  let m_newBoardState: T[][] = swapPieces(board.boardState, first, second);

  // Create Variables
  let m_matched: T;
  let m_matches: Position[];
  let m_effects: Effect<T>[] = [];
  let m_cleaned: T[][];
  let m_refilled: Board<T>;
  let m_hasMatching: boolean;

  do {
    // Check for Matches on First Position
    checkFor(first);

    // Check for Matches on Second Position
    checkFor(second);

    m_effects.push({ kind: "Refill" });

    // REMOVE AND REFILL MATCHED POSITIONS
    m_cleaned = removeMatchesFrom(m_newBoardState, m_matches);
    m_refilled = refillBoard({ ...board, boardState: m_cleaned });

    // Check for new matches
    m_hasMatching = anyMatching(m_refilled);
  } while (m_hasMatching);

  // Create Move Result
  m_result = { board: m_refilled, effects: m_effects };

  // Return Statement
  return m_result;
}

function removeMatchesFrom<T>(board: T[][], matches: Position[]): T[][] {
  let newBoard: T[][] = board.map((arr) => arr.slice());

  matches.forEach((m) => (newBoard[m.col][m.row] = null));

  return newBoard;
}

export function refillBoard<T>(board: Board<T>): Board<T> {
  let newBoardState: T[][] = board.boardState.map((arr) => arr.slice());

  // Loop through each row starting from the bottom
  for (let row = board.height - 1; row > 0; row--) {
    for (let col = 0; col < board.width; col++) {
      // Check if the current position is null
      if (newBoardState[col][row] === null) {
        // Find the first non-null piece in the column above
        let nonNullRow = row - 1;
        while (nonNullRow >= 0 && newBoardState[col][nonNullRow] === null) {
          nonNullRow--;
        }

        // Replace null with the first non-null piece above it (if found)
        if (nonNullRow >= 0) {
          newBoardState[col][row] = newBoardState[col][nonNullRow];
          newBoardState[col][nonNullRow] = null; // Set the position above to null
        }
      }
    }
  }

  // Loop through each row from the bottom to the top
  for (let row = board.height - 1; row >= 0; row--) {
    for (let col = 0; col < board.width; col++) {
      // Check if the tile is missing (null)
      if (newBoardState[col][row] === null) {
        // Generate a new tile using the sequence generator
        let newTile = board.sequenceGenerator.next();

        // Replace the missing tile with the new one
        newBoardState[col][row] = newTile;
      }
    }
  }

  // Create a new board with the updated board state
  let newBoard: Board<T> = {
    sequenceGenerator: board.sequenceGenerator,
    boardState: newBoardState,
    width: board.width,
    height: board.height,
  };

  return newBoard;
}

/**
 *
 * @param b updated state of the board
 * @param pos position to start from
 * @param dir cardinal direction to check
 * @param matched piece
 * @returns match event
 */
function getMatchEvent<T>(b: T[][], pos: Position, dir: "Vertical" | "Horizontal" | "None", matched: T): Effect<T> {
  let matchEvents: Effect<T>;

  if (dir != "None") {
    // Get Matches
    matched = getPiece(b, pos);
    let matches = getMatchPositions(b, dir, pos);

    // Add Matches to Effect
    let match = { matched: matched, positions: matches };
    matchEvents = { kind: "Match", match: match };
  }

  return matchEvents;
}

function getMatchPositions<T>(b: T[][], dir: "Vertical" | "Horizontal", refPos: Position): Position[] {
  function getFirstInDirection(board: T[][], p: Position, d: "Vertical" | "Horizontal", reference: T): Position {
    let dir: Position = directionToVector(d, true); // Vector Direction towards start of chain

    // Loop through pieces until the next does not match
    dir = checkNextIs(board, p, dir, reference);

    return dir;
  }

  function checkNextIs(board: T[][], p: Position, dir: Position, reference: T): Position {
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

  function getMatching(b: T[][], p: Position, dir: "Vertical" | "Horizontal", r: T): Position[] {
    // Empty Array to fill
    let matching: Position[] = [];

    // Direction
    let d = directionToVector(dir);

    addNext(b, p, d, r, matching);

    return matching;
  }

  function addNext(board: T[][], current: Position, dir: Position, reference: T, matchList: Position[]) {
    // Next Position
    let n: Position = {
      col: current.col + dir.col,
      row: current.row + dir.row,
    };

    // Add to List
    matchList.push(current);

    // Recursive Checks
    if (getPiece(board, n) == reference) addNext(board, n, dir, reference, matchList);
  }

  function directionToVector(d: "Vertical" | "Horizontal", reverse: boolean = false) {
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
  let piece: T = getPiece(b, refPos);

  // Get First Position in Line
  let firstInDir: Position = getFirstInDirection(b, refPos, dir, piece);

  // Get remaining positions
  let matches: Position[] = getMatching(b, firstInDir, dir, piece);

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
  if (p.col < 0 || p.row < 0 || board.length <= p.col || board[0].length <= p.row) {
    // Out Of Bounds
    return undefined;
  }

  // Inside Bounds
  return board[p.col][p.row];
}
