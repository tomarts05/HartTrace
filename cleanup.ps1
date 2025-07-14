# PowerShell script to clean up puzzle game project

# Navigate to project directory
Set-Location "c:\Programming\Game\HartAI"

# Remove unused component files
$unusedComponents = @(
    "components\DocumentPreview.tsx",
    "components\ErrorDisplay.tsx", 
    "components\FileDownloadStep.tsx",
    "components\Footer.tsx",
    "components\GeneratingStep.tsx",
    "components\Header.tsx",
    "components\Layout.tsx",
    "components\Navbar.tsx",
    "components\ResultsStep.tsx",
    "components\ResumeUploadStep.tsx",
    "components\Sidebar.tsx"
)

foreach ($file in $unusedComponents) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Deleted: $file"
    }
}

# Remove unused icon files (keep only ClockIcon.tsx and ReplayIcon.tsx)
$unusedIcons = @(
    "components\icons\AIHeroGraphic.tsx",
    "components\icons\BookOpenIcon.tsx",
    "components\icons\BriefcaseIcon.tsx", 
    "components\icons\CheckIcon.tsx",
    "components\icons\ClipboardIcon.tsx",
    "components\icons\DocumentTextIcon.tsx",
    "components\icons\DownloadIcon.tsx",
    "components\icons\FileIcon.tsx",
    "components\icons\LogoIcon.tsx",
    "components\icons\LogoutIcon.tsx",
    "components\icons\MegaphoneIcon.tsx",
    "components\icons\PaletteIcon.tsx",
    "components\icons\RefreshIcon.tsx",
    "components\icons\ScaleIcon.tsx",
    "components\icons\SignatureIcon.tsx",
    "components\icons\SparklesIcon.tsx",
    "components\icons\UploadCloudIcon.tsx",
    "components\icons\XCircleIcon.tsx"
)

foreach ($file in $unusedIcons) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Deleted: $file"
    }
}

# Remove unused directories
$unusedDirs = @(
    "pages",
    "tools", 
    "context",
    "services",
    "src"
)

foreach ($dir in $unusedDirs) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force
        Write-Host "Deleted directory: $dir"
    }
}

# Remove unused root files
$unusedFiles = @(
    "debug-test.html",
    "hart-ai---intelligent-application-suite.zip",
    "metadata.json",
    "types.ts",
    "FACEBOOK_SETUP.md",
    "PUZZLE_GAME_SUMMARY.md",
    ".env",
    ".env.example"
)

foreach ($file in $unusedFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Deleted: $file"
    }
}

Write-Host "Cleanup completed! Testing build..."
npm run build
