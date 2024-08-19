import gradio as gr
import numpy as np
import random
import torch
from diffusers import DiffusionPipeline
from huggingface_hub import login
import os

hf_token = "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"
login(hf_token)
# dtype = torch.bfloat16
device = "cuda" if torch.cuda.is_available() else "cpu"

MAX_SEED = np.iinfo(np.int32).max
MAX_IMAGE_SIZE = 2048

lora_model="davisbro/half_illustration"

# Initialize the pipeline globally
pipe = DiffusionPipeline.from_pretrained("black-forest-labs/FLUX.1-dev", torch_dtype=torch.bfloat16, token=hf_token).to(device)
pipe.load_lora_weights(lora_model)

def infer(prompt, seed=0, randomize_seed=True, width=1024, height=1024, guidance_scale=5.0, num_inference_steps=28, progress=gr.Progress(track_tqdm=True)):
    global pipe

    if randomize_seed:
        seed = random.randint(0, MAX_SEED)
    generator = torch.Generator().manual_seed(seed)
    
    try:
        image = pipe(
            prompt=f"in the style of TOK, {prompt}", 
            width=width,
            height=height,
            num_inference_steps=num_inference_steps, 
            generator=generator,
            guidance_scale=guidance_scale
        ).images[0]

        # update the save image path
        outputs = "outputs"
        if not os.path.exists(outputs):
            os.makedirs(outputs, exist_ok=True)
        image_path = os.path.join(outputs, f"{seed}.png")
        image.save(image_path)
        
        return image_path
    except Exception as e:
        return None

css = """
#col-container {
    margin: 0 auto;
    max-width: 520px;
}
"""

with gr.Blocks(css=css) as demo:
    with gr.Column(elem_id="col-container"):
        gr.Markdown(f"""# FLUX.1 [dev] with half illustration lora
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
        
        result = gr.Image(label="Result", show_label=False, type="filepath")
        
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

    gr.on(
        triggers=[run_button.click, prompt.submit],
        fn=infer,
        inputs=[prompt, seed, randomize_seed, width, height, guidance_scale, num_inference_steps],
        outputs=[result]
    )

# demo.launch()
demo.queue().launch(
    share=False,
    debug=False,
    server_name="0.0.0.0",
    server_port=7778,
)

