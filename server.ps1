# server.ps1 — Local HTTP server for the weather app
# Serves static files from its own directory on http://localhost:8080
# Requires PowerShell 5.1+ (uses System.Net.HttpListener)

$rootDir = $PSScriptRoot

# MIME type map
$mimeTypes = @{
    '.html' = 'text/html'
    '.js'   = 'application/javascript'
    '.css'  = 'text/css'
}

function Get-MimeType($extension) {
    if ($mimeTypes.ContainsKey($extension)) {
        return $mimeTypes[$extension]
    }
    return 'application/octet-stream'
}

# Create and start the listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')

try {
    $listener.Start()
} catch [System.Net.HttpListenerException] {
    Write-Host "Error: Port 8080 is already in use. Please free the port and try again."
    exit 1
} catch {
    Write-Host "Error: Failed to start the server: $_"
    exit 1
}

Write-Host "Server listening on http://localhost:8080"
Write-Host "Press Ctrl+C to stop."

try {
    while ($true) {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.AbsolutePath

        # Resolve root requests to index.html
        if ($rawUrl -eq '/' -or $rawUrl -eq '') {
            $filePath = Join-Path $rootDir 'index.html'
        } else {
            # Strip leading slash and build full path
            $relativePath = $rawUrl.TrimStart('/')
            $filePath = Join-Path $rootDir $relativePath
        }

        # Normalise the path to prevent directory traversal
        $filePath = [System.IO.Path]::GetFullPath($filePath)

        # Ensure the resolved path is still inside the root directory
        if (-not $filePath.StartsWith($rootDir)) {
            $response.StatusCode = 404
            $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
            $response.ContentType = 'text/plain'
            $response.ContentLength64 = $body.Length
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.OutputStream.Close()
            continue
        }

        # Non-root directory paths → 404
        if ([System.IO.Directory]::Exists($filePath)) {
            $response.StatusCode = 404
            $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
            $response.ContentType = 'text/plain'
            $response.ContentLength64 = $body.Length
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.OutputStream.Close()
            continue
        }

        # Missing file → 404
        if (-not [System.IO.File]::Exists($filePath)) {
            $response.StatusCode = 404
            $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
            $response.ContentType = 'text/plain'
            $response.ContentLength64 = $body.Length
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.OutputStream.Close()
            continue
        }

        # Serve the file
        $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = Get-MimeType $extension

        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.StatusCode = 200
        $response.ContentType = $contentType
        $response.ContentLength64 = $fileBytes.Length
        $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
