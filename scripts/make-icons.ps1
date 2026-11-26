param([string]$OutDir = "public")

Add-Type -AssemblyName System.Drawing

function New-AppIcon {
  param([int]$Size, [string]$Path)
  $s = $Size / 192.0
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $radius = 40 * $s
  $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $radius
  $gp.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $gp.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $gp.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $gp.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $gp.CloseFigure()
  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 118, 110))
  $g.FillPath($bg, $gp)

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(204, 251, 241), (18 * $s))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($pen, (42 * $s), (60 * $s), (150 * $s), (60 * $s))
  $g.DrawLine($pen, (60 * $s), (96 * $s), (132 * $s), (96 * $s))
  $g.DrawLine($pen, (78 * $s), (132 * $s), (114 * $s), (132 * $s))

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.FillEllipse($white, ((96 - 15) * $s), ((60 - 15) * $s), (30 * $s), (30 * $s))

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $pen.Dispose(); $bg.Dispose(); $white.Dispose(); $gp.Dispose(); $bmp.Dispose()
}

New-AppIcon 192 (Join-Path $OutDir "icon-192.png")
New-AppIcon 512 (Join-Path $OutDir "icon-512.png")
Write-Output "icons created"
