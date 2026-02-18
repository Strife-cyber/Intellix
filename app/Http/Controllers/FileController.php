<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class FileController extends Controller
{
    public function preview($path): JsonResponse
    {
        $url = Storage::disk('s3')->temporaryUrl(
            $path,
            now()->addMinutes(15)
        );

        return response()->json(['url' => $url]);
    }
}
