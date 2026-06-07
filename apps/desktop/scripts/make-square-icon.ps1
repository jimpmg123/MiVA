Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "..\public\images\miva-icon.png"
$out = Join-Path $PSScriptRoot "..\public\images\miva-icon-square.png"

$img = [System.Drawing.Image]::FromFile($src)
$size = [Math]::Max($img.Width, $img.Height)
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$x = ($size - $img.Width) / 2
$y = ($size - $img.Height) / 2
$g.DrawImage($img, $x, $y, $img.Width, $img.Height)
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$bmp.Dispose()
$g.Dispose()

Write-Host "Created $out (${size}x${size})"
