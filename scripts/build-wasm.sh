#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CRATES_DIR="${PROJECT_ROOT}/crates"

# Target sizes in KB
declare -A TARGET_SIZES=(
    ["expense-optimizer"]=50
    ["finance-core"]=30
    ["media-processor"]=300
)

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get file size in bytes (macOS compatible)
get_file_size() {
    local file="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$file"
    else
        stat -c%s "$file"
    fi
}

check_requirements() {
    log_info "Checking requirements..."

    # Check cargo
    if ! command -v cargo &> /dev/null; then
        log_error "cargo is not installed. Please install Rust first."
        exit 1
    fi
    log_success "cargo is installed"

    # Check/install wasm-pack
    if ! command -v wasm-pack &> /dev/null; then
        log_warn "wasm-pack not found. Installing..."
        cargo install wasm-pack
        if ! command -v wasm-pack &> /dev/null; then
            log_error "Failed to install wasm-pack"
            exit 1
        fi
    fi
    log_success "wasm-pack is installed"

    # Check for optional wasm-opt
    if command -v wasm-opt &> /dev/null; then
        log_success "wasm-opt is available (optional optimization)"
    else
        log_warn "wasm-opt not found. Install binaryen for additional optimization."
    fi

    echo ""
}

build_package() {
    local package="$1"
    local package_dir="${CRATES_DIR}/${package}"

    if [[ ! -d "$package_dir" ]]; then
        log_error "Package directory not found: ${package_dir}"
        return 1
    fi

    log_info "Building ${package}..."

    # Run wasm-pack build
    cd "$package_dir"
    wasm-pack build --target web --release

    # Find the generated wasm file
    local wasm_file="${package_dir}/pkg/${package//-/_}_bg.wasm"

    if [[ ! -f "$wasm_file" ]]; then
        log_error "WASM file not found: ${wasm_file}"
        return 1
    fi

    # Run wasm-opt if available
    if command -v wasm-opt &> /dev/null; then
        log_info "Optimizing ${package} with wasm-opt..."
        wasm-opt -Oz "$wasm_file" -o "$wasm_file"
    fi

    # Report size
    local actual_size_bytes
    actual_size_bytes=$(get_file_size "$wasm_file")
    local actual_size_kb=$((actual_size_bytes / 1024))
    local target_size=${TARGET_SIZES[$package]}

    if [[ $actual_size_kb -le $target_size ]]; then
        log_success "${package}: ${actual_size_kb}KB (target: ${target_size}KB) ✓"
    else
        log_warn "${package}: ${actual_size_kb}KB exceeds target of ${target_size}KB"
    fi

    cd "$PROJECT_ROOT"
    echo ""
}

build_all() {
    log_info "Building all WASM packages..."
    echo ""

    for package in "${!TARGET_SIZES[@]}"; do
        build_package "$package"
    done

    log_success "All packages built!"
}

run_tests() {
    log_info "Running workspace tests..."
    cd "$CRATES_DIR"
    cargo test --workspace
    log_success "All tests passed!"
    cd "$PROJECT_ROOT"
}

show_help() {
    echo "Steamboat WASM Build Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --all                Build all WASM packages (default)"
    echo "  --expense-optimizer  Build only expense-optimizer"
    echo "  --finance-core       Build only finance-core"
    echo "  --media-processor    Build only media-processor"
    echo "  --test               Run workspace tests"
    echo "  --help               Show this help message"
    echo ""
    echo "Target sizes:"
    echo "  expense-optimizer: 50KB"
    echo "  finance-core: 30KB"
    echo "  media-processor: 300KB"
}

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Steamboat WASM Build Script        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    # Default to --all if no arguments
    if [[ $# -eq 0 ]]; then
        set -- "--all"
    fi

    check_requirements

    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                build_all
                shift
                ;;
            --expense-optimizer)
                build_package "expense-optimizer"
                shift
                ;;
            --finance-core)
                build_package "finance-core"
                shift
                ;;
            --media-processor)
                build_package "media-processor"
                shift
                ;;
            --test)
                run_tests
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    echo ""
    log_success "Build script completed!"
}

main "$@"
