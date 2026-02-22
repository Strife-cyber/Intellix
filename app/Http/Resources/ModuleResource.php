<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ModuleResource extends JsonResource
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
            'title' => $this->title,
            'description' => $this->description,
            'order_index' => $this->order_index,
            'chapters' => ChapterResource::collection($this->whenLoaded('chapters')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
