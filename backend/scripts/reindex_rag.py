"""CLI utility to reindex planner RAG vectors in Pinecone.

Examples:
  python scripts/reindex_rag.py --full
  python scripts/reindex_rag.py --entity-type HOTEL --entity-id <uid>
  python scripts/reindex_rag.py --entity-type TOUR --entity-id <tour_id> --delete
  python scripts/reindex_rag.py --full --dry-run
"""

import argparse
import os
import sys


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.services.rag_indexer_service import delete_entity, full_reindex, upsert_entity  # noqa: E402
from app.services.firebase_service import init_firebase
from flask import Flask


def parse_args():
    parser = argparse.ArgumentParser(description="RAG reindex utility")
    parser.add_argument("--full", action="store_true", help="Reindex all supported entities")
    parser.add_argument("--entity-type", type=str, help="Entity type: HOTEL|RESTAURANT|TOUR|GUIDE_SERVICE")
    parser.add_argument("--entity-id", type=str, help="Entity identifier")
    parser.add_argument("--delete", action="store_true", help="Delete vector instead of upsert for entity mode")
    parser.add_argument("--dry-run", action="store_true", help="Preview only; do not write vectors")
    return parser.parse_args()


def main():
    args = parse_args()
    
    app = Flask(__name__)
    init_firebase(app)
    
    if args.full:
        result = full_reindex(dry_run=args.dry_run)
        print(result)
        return 0

    if args.entity_type and args.entity_id:
        if args.delete:
            result = delete_entity(args.entity_type, args.entity_id, dry_run=args.dry_run)
        else:
            result = upsert_entity(args.entity_type, args.entity_id, dry_run=args.dry_run)
        print(result)
        return 0

    print("Either --full or both --entity-type and --entity-id are required.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
