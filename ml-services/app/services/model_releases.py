"""Versioned model artifacts with an atomic per-disease active pointer."""
import json
import os
from pathlib import Path
from uuid import UUID, uuid4

from config import DATASET_CLEAN_DIR, DISEASE_CONFIG, MODELS_DIR


def release_root(disease: str) -> Path:
    return MODELS_DIR / "releases" / disease


def pointer_path(disease: str) -> Path:
    return MODELS_DIR / f"active_{disease}.json"


def active_artifacts(disease: str) -> tuple[str, Path, Path, dict]:
    """Resolve one complete release, or the original bundled artifacts."""
    cfg = DISEASE_CONFIG[disease]
    pointer = pointer_path(disease)
    if pointer.exists():
        release_id = json.loads(pointer.read_text(encoding="utf-8"))["release_id"]
        try:
            if not isinstance(release_id, str) or UUID(hex=release_id).hex != release_id:
                raise ValueError
        except (ValueError, TypeError) as exc:
            raise ValueError("Invalid model release pointer") from exc
        root = release_root(disease) / release_id
        model_path = root / "model.pkl"
        feature_path = root / "features.csv"
        metadata = json.loads((root / "metadata.json").read_text(encoding="utf-8"))
        return release_id, model_path, feature_path, metadata

    metadata_path = MODELS_DIR / "metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
    return "legacy", MODELS_DIR / cfg["model_file"], DATASET_CLEAN_DIR / cfg["feature_file"], metadata.get(disease, {})


def new_release_dir(disease: str) -> tuple[str, Path]:
    release_id = uuid4().hex
    root = release_root(disease) / release_id
    root.mkdir(parents=True, exist_ok=False)
    return release_id, root


def publish_release(disease: str, release_id: str) -> None:
    """The single pointer replacement publishes model, features, and metadata."""
    pointer = pointer_path(disease)
    pointer.parent.mkdir(parents=True, exist_ok=True)
    temporary = pointer.with_name(f".{pointer.name}.{uuid4().hex}.tmp")
    try:
        temporary.write_text(json.dumps({"release_id": release_id}), encoding="utf-8")
        os.replace(temporary, pointer)
    finally:
        temporary.unlink(missing_ok=True)
