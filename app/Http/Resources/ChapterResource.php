<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChapterResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'module_id' => $this->module_id,
            'title' => $this->title,
            'description' => $this->description,
            'order_index' => $this->order_index,
            'estimated_duration' => $this->estimated_duration,
            'prosits' => PrositResource::collection($this->whenLoaded('prosits')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
