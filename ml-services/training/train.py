import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import DISEASE_CONFIG
from training.train_dbd import train_dbd_model
from training.train_ispa import train_ispa_model
from training.train_leptospirosis import train_leptospirosis_model

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def train_all_diseases(disease_name: str = "all"):
    """Unified entry point to train models for specified disease or all diseases."""
    d_lower = disease_name.lower()

    if d_lower in ["dbd", "all"]:
        train_dbd_model()
    if d_lower in ["ispa", "all"]:
        train_ispa_model()
    if d_lower in ["leptospirosis", "all"]:
        train_leptospirosis_model()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ML Models for PRAKIRA")
    parser.add_argument(
        "--disease",
        type=str,
        default="all",
        help="dbd, ispa, leptospirosis, or all",
    )
    args = parser.parse_args()
    train_all_diseases(disease_name=args.disease)
