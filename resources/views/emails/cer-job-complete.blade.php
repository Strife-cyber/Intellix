<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CER Generated</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
            background-color: #0a0a0a;
            color: #e5e5e5;
            line-height: 1.6;
        }
        .wrapper {
            max-width: 600px;
            margin: 0 auto;
            padding: 32px 16px;
        }

        /* ── Header ── */
        .header {
            text-align: center;
            padding: 40px 0 32px;
            border-bottom: 1px solid #1f1f1f;
        }
        .logo {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #ffffff 0%, #9F4EFF 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .badge {
            display: inline-block;
            margin-top: 12px;
            padding: 6px 18px;
            border-radius: 100px;
            background: rgba(111, 6, 249, 0.12);
            border: 1px solid rgba(111, 6, 249, 0.25);
            font-size: 13px;
            font-weight: 600;
            color: #9F4EFF;
        }

        /* ── Body ── */
        .body-content {
            padding: 32px 0;
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .greeting {
            font-size: 15px;
            color: #a0a0a0;
            margin-bottom: 24px;
        }
        .detail-card {
            background: #121212;
            border: 1px solid #1f1f1f;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
        }
        .detail-row + .detail-row {
            border-top: 1px solid #1a1a1a;
        }
        .detail-label {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
        }
        .detail-value {
            font-size: 14px;
            color: #e5e5e5;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
        }
        .detail-value.green {
            color: #22c55e;
        }

        /* ── Buttons ── */
        .actions {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }
        .btn {
            flex: 1;
            display: inline-block;
            padding: 14px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            text-align: center;
            transition: opacity 0.2s;
        }
        .btn-primary {
            background: #6F06F9;
            color: #ffffff;
        }
        .btn-primary:hover {
            opacity: 0.9;
        }
        .btn-secondary {
            background: #1f1f1f;
            color: #e5e5e5;
            border: 1px solid #2a2a2a;
        }
        .btn-secondary:hover {
            background: #2a2a2a;
        }

        /* ── Info ── */
        .info-box {
            background: rgba(111, 6, 249, 0.04);
            border: 1px solid rgba(111, 6, 249, 0.1);
            border-radius: 10px;
            padding: 18px 22px;
            margin-bottom: 24px;
        }
        .info-box p {
            font-size: 13px;
            color: #9ca3af;
            line-height: 1.7;
        }

        /* ── Footer ── */
        .footer {
            border-top: 1px solid #1f1f1f;
            padding: 24px 0 0;
            text-align: center;
        }
        .footer p {
            font-size: 12px;
            color: #4b5563;
        }
        .footer a {
            color: #6F06F9;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 480px) {
            .actions { flex-direction: column; }
            .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
            .detail-value { text-align: left; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        {{-- Header --}}
        <div class="header">
            <div class="logo">IntelliX</div>
            <div class="badge">CER Generation Complete</div>
        </div>

        {{-- Body --}}
        <div class="body-content">
            <h1>Your CER is ready, {{ $userName }}</h1>
            <p class="greeting">
                The generation of <strong style="color:#e5e5e5;">"{{ $title }}"</strong> has finished successfully.
                You can now download your files below.
            </p>

            {{-- Details card --}}
            <div class="detail-card">
                <div class="detail-row">
                    <span class="detail-label">Document</span>
                    <span class="detail-value">{{ $title }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value green">✓ Completed</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Job ID</span>
                    <span class="detail-value" style="font-family:monospace;font-size:12px;">{{ $jobId }}</span>
                </div>
            </div>

            {{-- Download buttons --}}
            <div class="actions">
                <a href="{{ $pdfUrl }}" class="btn btn-primary">
                    Download PDF
                </a>
                <a href="{{ $latexUrl }}" class="btn btn-secondary">
                    Download LaTeX
                </a>
            </div>

            {{-- Info --}}
            <div class="info-box">
                <p>
                    Your CER has been saved to your document library and is accessible from your dashboard.
                    The PDF is ready for submission, and the LaTeX source is available if you need to make
                    further edits before finalising.
                </p>
            </div>
        </div>

        {{-- Footer --}}
        <div class="footer">
            <p>
                Sent from <a href="{{ $appUrl }}">IntelliX</a> &mdash;
                The AI-Native Learning Operating System<br>
                &copy; {{ $year }} IntelliX. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
