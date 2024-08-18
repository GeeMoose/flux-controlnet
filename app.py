import gradio as gr
import numpy as np
import random
import spaces
import torch
from diffusers import DiffusionPipeline, FlowMatchEulerDiscreteScheduler
from transformers import CLIPTextModel, CLIPTokenizer, T5EncoderModel, T5TokenizerFast
from huggingface_hub import hf_hub_download
import os

dtype = torch.bfloat16
device = "cuda" if torch.cuda.is_available() else "cpu"

MAX_SEED = np.iinfo(np.int32).max
MAX_IMAGE_SIZE = 2048

# Initialize the pipeline globally
pipe = DiffusionPipeline.from_pretrained("black-forest-labs/FLUX.1-dev", torch_dtype=torch.bfloat16).to(device)

@spaces.GPU(duration=300)
def infer(prompt, lora_model, seed=42, randomize_seed=False, width=1024, height=1024, guidance_scale=5.0, num_inference_steps=28, progress=gr.Progress(track_tqdm=True)):
    global pipe
    
    # Load LoRA if specified
    if lora_model:
        try:
            pipe.load_lora_weights(lora_model)
        except Exception as e:
            return None, seed, f"Failed to load LoRA model: {str(e)}"

    if randomize_seed:
        seed = random.randint(0, MAX_SEED)
    generator = torch.Generator().manual_seed(seed)
    
    try:
        image = pipe(
            prompt=prompt, 
            width=width,
            height=height,
            num_inference_steps=num_inference_steps, 
            generator=generator,
            guidance_scale=guidance_scale
        ).images[0]
        
        # Unload LoRA weights after generation
        if lora_model:
            pipe.unload_lora_weights()
        
        return image, seed, "Image generated successfully."
    except Exception as e:
        return None, seed, f"Error during image generation: {str(e)}"

examples = [
    ["a tiny astronaut hatching from an egg on the moon", ""],
    ["a cat holding a sign that says hello world", ""],
    ["an anime illustration of a wiener schnitzel", ""],
]

css = """
#col-container {
    margin: 0 auto;
    max-width: 520px;
}
"""

with gr.Blocks(css=css) as demo:
    with gr.Column(elem_id="col-container"):
        gr.Markdown(f"""# FLUX.1 [dev] with LoRA Support
12B param rectified flow transformer guidance-distilled from [FLUX.1 [pro]](https://blackforestlabs.ai/)  
[[non-commercial license](https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/LICENSE.md)] [[blog](https://blackforestlabs.ai/announcing-black-forest-labs/)] [[model](https://huggingface.co/black-forest-labs/FLUX.1-dev)]
        """)
        
        with gr.Row():
            prompt = gr.Text(
                label="Prompt",
                show_label=False,
                max_lines=1,
                placeholder="Enter your prompt",
                container=False,
            )
            run_button = gr.Button("Run", scale=0)
        
        lora_model = gr.Text(
            label="LoRA Model ID (optional)",
            placeholder="Enter Hugging Face LoRA model ID",
        )
        
        result = gr.Image(label="Result", show_label=False)
        output_message = gr.Textbox(label="Output Message")
        
        with gr.Accordion("Advanced Settings", open=False):
            seed = gr.Slider(
                label="Seed",
                minimum=0,
                maximum=MAX_SEED,
                step=1,
                value=0,
            )
            randomize_seed = gr.Checkbox(label="Randomize seed", value=True)
            with gr.Row():
                width = gr.Slider(
                    label="Width",
                    minimum=256,
                    maximum=MAX_IMAGE_SIZE,
                    step=32,
                    value=1024,
                )
                height = gr.Slider(
                    label="Height",
                    minimum=256,
                    maximum=MAX_IMAGE_SIZE,
                    step=32,
                    value=1024,
                )
            with gr.Row():
                guidance_scale = gr.Slider(
                    label="Guidance Scale",
                    minimum=1,
                    maximum=15,
                    step=0.1,
                    value=3.5,
                )
                num_inference_steps = gr.Slider(
                    label="Number of inference steps",
                    minimum=1,
                    maximum=50,
                    step=1,
                    value=28,
                )
        
        gr.Examples(
            examples=examples,
            fn=infer,
            inputs=[prompt, lora_model],
            outputs=[result, seed, output_message],
            cache_examples="lazy"
        )

    gr.on(
        triggers=[run_button.click, prompt.submit],
        fn=infer,
        inputs=[prompt, lora_model, seed, randomize_seed, width, height, guidance_scale, num_inference_steps],
        outputs=[result, seed, output_message]
    )

demo.launch()