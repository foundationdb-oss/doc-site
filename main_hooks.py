"""
MkDocs Macros Plugin Hooks for FoundationDB Documentation

This module provides version-specific variables and macros that are used
throughout the documentation to ensure version-accurate content.

The FDB_VERSION environment variable controls which version configuration is used.
This is set by the build script before each mike deploy.
"""
import os

# Version configuration - all version-specific values in one place
VERSION_CONFIG = {
    "7.1": {
        "fdb_version": "7.1",
        "fdb_release": "7.1.67",
        "api_version": 710,
        "docker_tag": "7.1.67",
        "redwood_engine": "ssd-redwood-1-experimental",
        "version_label": "Legacy",
        "is_stable": False,
        "is_latest": False,
        "java_version": "7.1.67",
        "package_version": "7.1.67",
    },
    "7.3": {
        "fdb_version": "7.3",
        "fdb_release": "7.3.71",
        "api_version": 730,
        "docker_tag": "7.3.71",
        "redwood_engine": "ssd-redwood-1",
        "version_label": "Stable",
        "is_stable": True,
        "is_latest": True,
        "java_version": "7.3.71",
        "package_version": "7.3.71",
    },
    "7.4": {
        "fdb_version": "7.4",
        "fdb_release": "7.4.6",
        "api_version": 740,
        "docker_tag": "7.4.6",
        "redwood_engine": "ssd-redwood-1",
        "version_label": "Pre-release",
        "is_stable": False,
        "is_latest": False,
        "java_version": "7.4.6",
        "package_version": "7.4.6",
        "go_close_required": True,  # 7.4+ requires Close() on Database
    },
}

# Default to 7.3 (stable)
DEFAULT_VERSION = "7.3"


def define_env(env):
    """
    Define variables and macros for the MkDocs macros plugin.
    
    This is called by mkdocs-macros-plugin to set up the Jinja2 environment.
    """
    # Get version from environment variable or use default
    current_version = os.environ.get("FDB_VERSION", DEFAULT_VERSION)
    
    # Get the configuration for this version
    if current_version in VERSION_CONFIG:
        config = VERSION_CONFIG[current_version]
    else:
        # Fallback to default if unknown version
        config = VERSION_CONFIG[DEFAULT_VERSION]
    
    # Export all configuration as variables
    for key, value in config.items():
        env.variables[key] = value
    
    # Add additional computed variables
    env.variables["fdb_deb_url"] = (
        f"https://github.com/apple/foundationdb/releases/download/"
        f"{config['fdb_release']}/foundationdb-clients_{config['fdb_release']}-1_amd64.deb"
    )
    env.variables["fdb_rpm_url"] = (
        f"https://github.com/apple/foundationdb/releases/download/"
        f"{config['fdb_release']}/foundationdb-clients-{config['fdb_release']}-1.el7.x86_64.rpm"
    )
    env.variables["docker_image"] = f"foundationdb/foundationdb:{config['docker_tag']}"
    
    # Define helper macros
    @env.macro
    def version_note(min_version: str, note_type: str = "info"):
        """Generate a version note admonition."""
        if min_version == current_version:
            return f'!!! {note_type} "New in {min_version}"\n'
        elif min_version > current_version:
            return ""  # Don't show notes for features in future versions
        else:
            return ""  # Feature exists in this version, no note needed
    
    @env.macro
    def if_version(min_version: str, content: str, else_content: str = ""):
        """Conditionally include content based on version."""
        if current_version >= min_version:
            return content
        return else_content
    
    @env.macro
    def version_pill(version: str, pill_type: str = "new"):
        """Generate a version pill badge."""
        pill_class = {
            "new": "pill-new",
            "improved": "pill-improved",
            "experimental": "pill-experimental",
        }.get(pill_type, "pill-new")
        label = {
            "new": f"NEW in {version}",
            "improved": f"IMPROVED in {version}",
            "experimental": "EXPERIMENTAL",
        }.get(pill_type, f"NEW in {version}")
        return f'<span class="{pill_class}">{label}</span>'

