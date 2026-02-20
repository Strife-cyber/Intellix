<?php

namespace App\Http\Controllers;

use App\Models\FlashCard;
use App\Http\Requests\StoreFlashCardRequest;
use App\Http\Requests\UpdateFlashCardRequest;

class FlashCardController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreFlashCardRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(FlashCard $flashCard)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(FlashCard $flashCard)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateFlashCardRequest $request, FlashCard $flashCard)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FlashCard $flashCard)
    {
        //
    }
}
