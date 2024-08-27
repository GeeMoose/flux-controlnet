import gradio as gr
import numpy as np
import random
import torch
from diffusers import FluxPipeline
from huggingface_hub import login
import os

# dtype = torch.bfloat16
device = "cuda" if torch.cuda.is_available() else "cpu"

MAX_SEED = np.iinfo(np.int32).max
MAX_IMAGE_SIZE = 2048

lora_model="davisbro/half_illustration"

# Initialize the pipeline globally
pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-dev", torch_dtype=torch.bfloat16, token="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").to(device)
pipe.load_lora_weights(lora_model)

def update_custom_size_visibility(choice):
    return gr.update(visible=choice == "Custom")

def infer(prompt, seed=0, randomize_seed=True, image_size="1024x576", custom_width=1024, custom_height=1024, guidance_scale=5.0, num_inference_steps=28, progress=gr.Progress(track_tqdm=True)):
    global pipe

    if randomize_seed:
        seed = random.randint(0, MAX_SEED)
    generator = torch.Generator().manual_seed(seed)
    
    if image_size == "Custom":
        width, height = custom_width, custom_height
    else:
        # 从image_size字符串中提取宽度和高度
        width, height = map(int, image_size.split('x'))

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
        
        #添加gradio组件用于选择图片尺寸
        image_size = gr.Radio(
            label="Image Size",
            choices=["512x512", "1024x1024", "768x1024","576x1024","1024x768","1024x576","Custom"],
            value="512x512",
        )

        with gr.Column(visible=False) as custom_size_col:
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

        image_size.change(
            fn=update_custom_size_visibility,
            inputs=[image_size],
            outputs=[custom_size_col]
        )
        
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
        inputs=[prompt, seed, randomize_seed, image_size, width, height, guidance_scale, num_inference_steps],
        outputs=[result]
    )

demo.queue().launch(
    share=True,
    debug=False,
    server_name="0.0.0.0",
    server_port=7778,
)
