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

/**
 * Creates a Match 3 Board
 * @param c_generator piece generator
 * @param c_width width of play area
 * @param c_height height of play area
 * @returns board of given `c_width` and `c_height` filled with pieces from the `c_generator`
 */
export function create<T>(c_generator: Generator<T>, c_width: number, c_height: number): Board<T> {
  function createEmptyBoard(): T[][] {
    const ceb_boardState: T[][] = [];

    // Loop through number of Columns
    for (let col = 0; col < c_width; col++) {
      // Create an Empty Column
      let ceb_column: T[] = [];

      // Loop through number of Rows
      for (let row = 0; row < c_height; row++) {
        // Add NULL to the Column
        ceb_column.push(null);
      }

      // Add Columm to the state
      ceb_boardState.push(ceb_column);
    }

    return ceb_boardState;
  }

  // Return the Board
  return {
    // Field: Value
    sequenceGenerator: c_generator,
    boardState: populateBoard(createEmptyBoard(), c_generator),
    width: c_width,
    height: c_height,
  };
}

/**
 * Populates a 2-Dimensional Board [GRID] with Pieces using the given Generator
 * @param pb_board grid of type `T[][]` to fill with pieces
 * @param pb_generator generator for pieces of type `T`
 * @returns populated grid of type `T[][]`
 */
function populateBoard<T>(pb_board: T[][], pb_generator: Generator<T>): T[][] {
  const pb_newBoard: T[][] = duplicateBoard(pb_board);

  // Loop through Board State, row -> col, col, [...]
  for (let row = 0; row < pb_newBoard[0].length; row++) {
    for (let col = 0; col < pb_newBoard.length; col++) {
      // Return if Piece already exists
      if (pb_board[col][row]) continue;

      // Set the Piece
      const pb_nextPiece = pb_generator.next();
      pb_newBoard[col][row] = pb_nextPiece;
    }
  }

  return pb_newBoard;
}

/**
 * Retrieve a Piece on the Board, using a 2D
 * @param p_board board containing grid of type `T[][]` to retrieve a piece, `T`, from
 * @param p_pos 2D position of type `Position`
 * @returns piece of type `T` if exists, `undefined` if position is out of bounds
 */
export function piece<T>(p_board: Board<T>, p_pos: Position): T | undefined {
  // Check for Out Of Bounds (OOB)
  if (outOfBounds(p_board, p_pos)) {
    return undefined;
  }

  // Get the BoardState
  const p_boardState = p_board.boardState;

  // Retrieve Piece from BoardState
  const p_piece = p_boardState[p_pos.col][p_pos.row];

  // Return Piece
  return p_piece;
}

/**
 * Check if a Move is legal by pretending to perform move
 * Valid Moves have to satisfy the following
 * 1. moves pieces inside the board
 * 0. moving 2 different pieces
 * 0. pieces share either column or row
 * 0. moved pieces cause at least 1 match
 * 
 * @param cm_board board containing grid of type `T[][]`
 * @param cm_first position of type `Position`
 * @param cm_second position of type `Position`
 * @returns `true` if move is valid, `false` otherwise
 */
export function canMove<T>(cm_board: Board<T>, cm_first: Position, cm_second: Position): boolean {
  function illegalMoves(): boolean {
    const im_piece1 = piece(cm_board, cm_first);
    const im_piece2 = piece(cm_board, cm_second);
    if (im_piece1 === undefined || im_piece2 === undefined) return true;

    const im_c1 = cm_first.col,
      im_c2 = cm_second.col,
      im_r1 = cm_first.row,
      im_r2 = cm_second.row;

    // Return true if not in a Cardinal Direction
    if (im_c1 != im_c2 && im_r1 != im_r2) return true;

    // Calculate Difference between Columns && Rows && Magic (Maths)
    const im_col_diff = im_c1 - im_c2,
      im_row_diff = im_r1 - im_r2;

    return im_col_diff == 0 && im_row_diff == 0;
  }

  function legalMoves(): boolean {
    // Perform a Swap to check for possible matches
    let lm_simulatedBoard: T[][] = swapPieces(cm_board.boardState, cm_first, cm_second);

    // Check if Any Matches are found
    if (anyMatchingOn(lm_simulatedBoard, cm_first) == "None" && anyMatchingOn(lm_simulatedBoard, cm_second) == "None") {
      // No Matches Found
      return false;
    }

    return true;
  }

  if (illegalMoves()) return false;
  return legalMoves();
}

/**
 * Checks if any matches can be found on the given board, using the position parameter as a base
 *
 *  _intended use when pieces are moved, as they have to be part of a match to be a valid move_
 * @param amo_board grid of type `T[][]`
 * @param amo_pos position of type `Position`
 * @returns
 * - `"None"`: if no matches are found
 * - `"Horizontal"`: if a match is found between columns
 * - `"Vertical"`: if a match is found inside a column
 * - `"Both"`: if a match satisfies **both** `"Horizontal"` and `"Vertical"` requirements
 */
function anyMatchingOn<T>(amo_board: T[][], amo_pos: Position): "Horizontal" | "Vertical" | "Both" | "None" {
  // Reference Vectors
  const [amo_n, amo_e, amo_s, amo_w]: Position[] = [
    { row: -1, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
  ];

  const amo_refPiece: T = getPiece(amo_board, amo_pos);

  // Skip checking if Reference Piece is undefined
  if (amo_refPiece) {
    // Check if there are any matches
    const amo_match_WE = checkNext(amo_board, amo_refPiece, amo_pos, amo_w) + checkNext(amo_board, amo_refPiece, amo_pos, amo_e) - 1; // -1 to ensure the piece itself isn't counted twice
    const amo_match_NS = checkNext(amo_board, amo_refPiece, amo_pos, amo_n) + checkNext(amo_board, amo_refPiece, amo_pos, amo_s) - 1; // -1 to ensure the piece itself isn't counted twice

    // Check direction for matches
    if (amo_match_WE >= 3 && amo_match_NS >= 3) return "Both";
    if (amo_match_WE >= 3) return "Horizontal";
    if (amo_match_NS >= 3) return "Vertical";
  }
  return "None";
}

/**
 * Counts the number of pieces matching `cn_refPiece` in the given direction, starting with the `cn_currPos`
 * @param cn_board grid of type `T[][]`
 * @param cn_refPiece reference piece of type `T`
 * @param cn_currPos current position of type `Position`
 * @param cn_dir direction as a vector using type `Position`
 * 
 * `{col: 0, row: -1}` | `{col: 0, row: 1}` | `{col: -1, row: 0}` | `{col: 1, row: 0}`
 * @returns `number` of matching pieces found in given direction including `cn_currPos`
 */
function checkNext<T>(cn_board: T[][], cn_refPiece: T, cn_currPos: Position, cn_dir: Position): number {
  // Get the Piece at the current Position
  const cn_currPiece: T = getPiece(cn_board, cn_currPos);

  // Chec if the Piece matches the Reference Piece
  if (cn_currPiece && cn_currPiece == cn_refPiece) {
    // Calculate the next position
    const cn_newPos: Position = {
      col: cn_currPos.col + cn_dir.col,
      row: cn_currPos.row + cn_dir.row,
    };

    // Recursion to get multiple pieces
    return 1 + checkNext(cn_board, cn_refPiece, cn_newPos, cn_dir);
  } else {
    return 0;
  }
}

/**
 * Swap pieces on a board
 * @param sp_board grid of type `T[][]`
 * @param sp_p1 position of type `Position`
 * @param sp_p2 position of type `Position`
 * @returns grid of type `T[][]` with pieces on positions `sp_p1` and `sp_p2` being swapped
 */
function swapPieces<T>(sp_board: T[][], sp_p1: Position, sp_p2: Position): T[][] {
  // Copy the Board
  const sp_newBoard: T[][] = duplicateBoard(sp_board);

  // Perform Swap
  const sp_tmp: T = getPiece(sp_newBoard, sp_p1);
  sp_newBoard[sp_p1.col][sp_p1.row] = getPiece(sp_newBoard, sp_p2);
  sp_newBoard[sp_p2.col][sp_p2.row] = sp_tmp;

  // Return the board
  return sp_newBoard;
}

/**
 * Perform a Move. This checks the legality through `canMove()` before performing any moves
 * @param m_generator not being used
 * @param m_board board containing grid of type `T[][]`
 * @param m_first position of type `Position`
 * @param m_second position of type `Position`
 * @returns result of move as `MoveResult<T>`
 */
export function move<T>(m_generator: Generator<T>, m_board: Board<T>, m_first: Position, m_second: Position): MoveResult<T> {
  /**
   * Checks a given position for Matches and adds a Match Event to m_effects as well as adding the Match Positions to m_matches
   * @param cf_pos position to check for matches from
   * @param [cf_boardState=m_newBoardState] optional BoardState to check
   */
  function checkFor(cf_pos: Position, cf_boardState: T[][] = m_newBoardState) {
    let cf_direction: "None" | "Horizontal" | "Vertical" | "Both";

    cf_direction = anyMatchingOn(cf_boardState, cf_pos);
    if (cf_direction != "None") {
      if (cf_direction == "Both") {
        // Get the Horizontal & Vertical Matches
        let cf_horizontalMatches: Effect<T> = getMatchEvent(cf_boardState, cf_pos, "Horizontal");
        let cf_verticalMatches: Effect<T> = getMatchEvent(cf_boardState, cf_pos, "Vertical");

        // Push the Matches to the Effects
        m_effects.push(cf_horizontalMatches);
        m_effects.push(cf_verticalMatches);

        // Get the Matches' Positions
        m_matches = getMatchPositions(cf_boardState, "Horizontal", cf_pos);
        m_matches = m_matches.concat(getMatchPositions(cf_boardState, "Vertical", cf_pos));
      } else {
        m_effects.push(getMatchEvent(cf_boardState, cf_pos, cf_direction));
        if (!m_matches) {
          m_matches = getMatchPositions(cf_boardState, cf_direction, cf_pos);
        } else {
          m_matches = m_matches.concat(getMatchPositions(cf_boardState, cf_direction, cf_pos));
        }
      }
    }
  }

  function anyMatching(am_board: Board<T>): { any: boolean; position: Position } {
    const am_positions: Position[] = positions(am_board);

    for (const pos of am_positions) {
      if (anyMatchingOn(am_board.boardState, pos) != "None") return { any: true, position: pos };
    }

    return { any: false, position: null };
  }

  // Return Null if a Move is not allowed
  if (!canMove(m_board, m_first, m_second)) {
    return { board: m_board, effects: [] };
  }

  // Create the board with the pieces swapped
  let m_newBoardState: T[][] = swapPieces(m_board.boardState, m_first, m_second);

  // Create Variables used in checkFor(Position)
  let m_matches: Position[];
  let m_effects: Effect<T>[] = [];

  // Check for Matches on First Position
  checkFor(m_first);

  // Check for Matches on Second Position
  checkFor(m_second);

  // REMOVE AND REFILL MATCHED POSITIONS
  m_newBoardState = removeMatchesFrom(m_newBoardState, m_matches);
  let m_refilled: Board<T> = refillBoard({ ...m_board, boardState: m_newBoardState });
  m_effects.push({ kind: "Refill" });

  // Check for any matches caused by Refilling
  let m_newMatches: { any: boolean; position: Position } = anyMatching(m_refilled);
  while (m_newMatches.any) {
    // Reset Matches
    m_matches = [];
    checkFor(m_newMatches.position, m_refilled.boardState);

    // Remove Matches
    m_newBoardState = removeMatchesFrom(m_refilled.boardState, m_matches);

    // Refill
    m_refilled = refillBoard({ ...m_board, boardState: m_newBoardState });
    m_effects.push({ kind: "Refill" });

    // Check for new matches
    m_newMatches = anyMatching(m_refilled);
  }

  // Create Move Result
  const m_result = { board: m_refilled, effects: m_effects };

  // Return Statement
  return m_result;
}

/**
 * Remove the Pieces on a grid using a list of positions
 * @param rmf_board 2D grid of type `T[][]`
 * @param rmf_matches positions of the pieces to be removed of type `Position`
 * @returns 2D grid of type `T[][]` with the positions in `rmf_matches` set to `null`
 */
function removeMatchesFrom<T>(rmf_board: T[][], rmf_matches: Position[]): T[][] {
  // Duplicate BoardState
  const rmf_newBoard: T[][] = duplicateBoard(rmf_board);

  // Remove all Pieces on Positions matching rmf_matches on the duplicated BoardState
  rmf_matches.forEach((_) => (rmf_newBoard[_.col][_.row] = null));

  // Return the new BoardState
  return rmf_newBoard;
}

/**
 * Replace all empty spots (`false`/`null`/`undefined`) in the 2D grid found in `rb_board`
 * @param rb_board board containing grid of type `T[][]`
 * @returns refilled board containing grid of type `T[][]`
 */
export function refillBoard<T>(rb_board: Board<T>): Board<T> {
  const rb_newBoardState: T[][] = duplicateBoard(rb_board.boardState);

  // Loop through each row starting from the bottom
  for (let row = rb_board.height - 1; row > 0; row--) {
    for (let col = 0; col < rb_board.width; col++) {
      // Check if the current position is null
      if (!rb_newBoardState[col][row]) {
        // Find the first non-null piece in the column above
        let nonNullRow = row - 1;
        while (nonNullRow >= 0 && !rb_newBoardState[col][nonNullRow]) {
          nonNullRow--;
        }

        // Replace null with the first non-null piece above it (if found)
        if (nonNullRow >= 0) {
          rb_newBoardState[col][row] = rb_newBoardState[col][nonNullRow];
          rb_newBoardState[col][nonNullRow] = null; // Set the position above to null
        }
      }
    }
  }

  // Loop through each row from the bottom to the top
  for (let row = rb_board.height - 1; row >= 0; row--) {
    for (let col = 0; col < rb_board.width; col++) {
      // Check if the tile is missing (null)
      if (!rb_newBoardState[col][row]) {
        // Generate a new tile using the sequence generator
        const rb_newTile = rb_board.sequenceGenerator.next();

        // Replace the missing tile with the new one
        rb_newBoardState[col][row] = rb_newTile;
      }
    }
  }

  // Create a new board with the updated board state
  const rb_newBoard: Board<T> = {
    sequenceGenerator: rb_board.sequenceGenerator,
    boardState: rb_newBoardState,
    width: rb_board.width,
    height: rb_board.height,
  };

  return rb_newBoard;
}

/**
 * Create an `Effect<T>` with the Event caused by a Match
 * @param gme_board grid of type `T[][]`
 * @param gme_pos first position of a match as `Position`
 * @param gme_dir orientation to check of type `"Vertical"`/`"Horizontal"`/`"None"`
 * @returns null if `gme_dir` is `"None"`, otherwise match event of type `Effect<T>` containing the matched piece, `T`, and positions `Position[]`
 */
function getMatchEvent<T>(gme_board: T[][], gme_pos: Position, gme_dir: "Vertical" | "Horizontal" | "None"): Effect<T> {
  // Return null if no orientation was found
  if (gme_dir == "None") return null;

  // Get Matches
  const gme_piece: T = getPiece(gme_board, gme_pos);
  const gme_matchPositions: Position[] = getMatchPositions(gme_board, gme_dir, gme_pos);

  // Add Matches to Effect
  const gme_match: Match<T> = { matched: gme_piece, positions: gme_matchPositions };
  return { kind: "Match", match: gme_match };
}

/**
 * Get the positions of pieces in a match 
 * @param gmp_board grid of type `T[][]`
 * @param gmp_dir orientation of match either `"Vertical"`/`"Horizontal"`
 * @param gmp_refPos position of any piece in match, type `Position`
 * @returns 
 */
function getMatchPositions<T>(gmp_board: T[][], gmp_dir: "Vertical" | "Horizontal", gmp_refPos: Position): Position[] {
  function getFirstInDirection(gfid_board: T[][], gfid_pos: Position, gfid_dir: "Vertical" | "Horizontal", gfid_refPiece: T): Position {
    let gfid_dir_vector: Position = directionToVector(gfid_dir, true); // Vector Direction towards start of chain

    // Loop through pieces until the next does not match
    gfid_dir_vector = checkNextIs(gfid_board, gfid_pos, gfid_dir_vector, gfid_refPiece);

    return gfid_dir_vector;
  }

  function checkNextIs(cni_board: T[][], cni_pos: Position, cni_dir: Position, cni_refPiece: T): Position {
    const cni_newPos: Position = {
      col: cni_pos.col + cni_dir.col,
      row: cni_pos.row + cni_dir.row,
    };

    // Get Next Piece
    const cni_actualPiece: T = getPiece(cni_board, cni_newPos);

    // Check if Piece Matches
    if (cni_actualPiece != cni_refPiece) {
      // Return position if it does not match
      return cni_pos;
    } else {
      return checkNextIs(cni_board, cni_newPos, cni_dir, cni_refPiece);
    }
  }

  function getMatching(gm_board: T[][], gm_pos: Position, gm_dir: "Vertical" | "Horizontal", gm_refPiece: T): Position[] {
    // Empty Array to fill
    const gm_matching: Position[] = [];

    // Direction
    let gm_dir_vector = directionToVector(gm_dir);

    addNext(gm_board, gm_pos, gm_dir_vector, gm_refPiece, gm_matching);

    return gm_matching;
  }

  function addNext(an_board: T[][], am_currPos: Position, am_dir: Position, am_refPiece: T, am_matchList: Position[]) {
    // Next Position
    const am_nextPos: Position = {
      col: am_currPos.col + am_dir.col,
      row: am_currPos.row + am_dir.row,
    };

    // Add to List
    am_matchList.push(am_currPos);

    // Break Recursion
    if (getPiece(an_board, am_nextPos) != am_refPiece) return;

    // Recursive Checks
    addNext(an_board, am_nextPos, am_dir, am_refPiece, am_matchList);
  }

  function directionToVector(dtv_string: "Vertical" | "Horizontal", dtv_isReverse: boolean = false) {
    // Get Direction as a Vector
    const dtv_scale = dtv_isReverse ? -1 : 1; // Convert Boolean to Multiplier
    switch (dtv_string) {
      case "Vertical":
        return { col: 0, row: dtv_scale };
      case "Horizontal":
        return { col: dtv_scale, row: 0 };
      default: // Shouldn't be reached, but we'll see
        throw Error(`Direction (${dtv_string}) neither Horizontal or Vertical`);
    }
  }

  // Get Reference Piece
  const gmp_piece: T = getPiece(gmp_board, gmp_refPos);

  // Get First Position in Line
  let gmp_firstInDir: Position = getFirstInDirection(gmp_board, gmp_refPos, gmp_dir, gmp_piece);

  // Get remaining positions
  let gmp_matches: Position[] = getMatching(gmp_board, gmp_firstInDir, gmp_dir, gmp_piece);

  return gmp_matches;
}

/**
 * Get all positions in a list starting with all columns in a row before moving to the next row
 * @param p_board board containing grid of type `T[][]`
 * @returns list of all positons as `Position[]`
 */
export function positions<T>(p_board: Board<T>): Position[] {
  const p_positions: Position[] = [];

  // Loop through all Rows
  for (let y = 0; y < p_board.height; y++) {
    // Loop through all Columnss
    for (let x = 0; x < p_board.width; x++) {
      // Create a new Position
      const p_pos: Position = { col: x, row: y };

      // Add Position to the list of Positions
      p_positions.push(p_pos);
    }
  }

  // Return
  return p_positions;
}

/**
 * Get a piece from the board on a specific position
 * @param gp_board grid of type `T[][]`
 * @param gp_pos position of type `Position`
 * @returns piece of type `T` if exists, `undefined` otherwise
 */
function getPiece<T>(gp_board: T[][], gp_pos: Position): T | undefined {
  if (gp_pos.col < 0 || gp_pos.row < 0 || gp_board.length <= gp_pos.col || gp_board[0].length <= gp_pos.row) {
    // Out Of Bounds
    return undefined;
  }

  // Inside Bounds
  return gp_board[gp_pos.col][gp_pos.row];
}

/**
 * create a copy of a board without any links
 * @param db_board grid of type `T[][]`
 * @returns duplicate of `db_board`
 */
function duplicateBoard<T>(db_board: T[][]): T[][] {
  const db_duplicate = db_board.map((arr) => arr.slice());
  return db_duplicate;
}

/**
 * Check if a position is within the bounds/playing area of the board
 * @param oob_board board containing grid of type `T[][]`
 * @param oob_pos position of type `Position` 
 * @returns `true` if `oob_pos` is out of bounds, `false` otherwise
 */
function outOfBounds<T>(oob_board: Board<T>, oob_pos: Position): boolean {
  if (oob_pos.row < 0 || oob_pos.col < 0 || oob_pos.row >= oob_board.height || oob_pos.col >= oob_board.width) {
    return true;
  }
}
