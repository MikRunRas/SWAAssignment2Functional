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

export type Effect<T> = undefined;

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

  function anyMatching(
    board: T[][],
    p: Position
  ): "Horizontal" | "Vertical" | "None" {
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

    if (match_WE >= 3) return "Horizontal";
    if (match_NS >= 3) return "Vertical";

    return "None";
  }

  function checkNext(
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

  function swapPieces(board: T[][], p1: Position, p2: Position): T[][] {
    // Copy the Board
    let swappedBoard: T[][] = board.map((arr) => arr.slice());

    // Perform Swap
    let tmp: T = getPiece(swappedBoard, p1);
    swappedBoard[p1.col][p1.row] = getPiece(swappedBoard, p2);
    swappedBoard[p2.col][p2.row] = tmp;

    // Return the board
    return swappedBoard;
  }

  function legalMoves(): boolean {
    // Perform a Swap to check for possible matches
    let simulatedBoard = swapPieces(board.boardState, first, second);

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

export function move<T>(
  generator: Generator<T>,
  board: Board<T>,
  first: Position,
  second: Position
): MoveResult<T> {
  return null;
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
    // Loop through all Columns
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
